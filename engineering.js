/* Shared, dependency-free engineering records and standalone reports. */
(function(root){
  'use strict';
  const VERSION='1.0.0';
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=value=>JSON.parse(JSON.stringify(value));
  function record(text,meta={},kind,parser){
    const lines=String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);
    return {record_schema:'1.0',file_id:meta.file_id||meta.sha256||meta.name||'input',
      file:{name:meta.name||'未命名文本',bytes:meta.bytes??null,sha256:meta.sha256||null,
        hash_state:meta.sha256?'verified':'unverified',relative_path:meta.relative_path||null,source_note:meta.source_note||null},
      evidence_kind:kind,variant_id:meta.variant_id||null,bundle_id:meta.bundle_id||null,
      association_state:meta.association_confirmed?'confirmed':'unconfirmed',input_date:meta.input_date||null,
      parser_id:parser,parser_version:VERSION,parsed_at:meta.parsed_at||new Date().toISOString(),
      status:'partial',fields:{},warnings:[],errors:[],lines};
  }
  function field(rec,key,value,line,unit=null,kind=null){
    rec.fields[key]={value,unit,kind,line_start:line+1,line_end:line+1,raw_text:rec.lines[line]};
  }
  const value=(rec,key)=>rec.fields[key]?.value??null;
  function invalidText(rec){
    if(rec.lines.some(x=>/[\u0000\uFFFD]/.test(x))){rec.status='error';rec.errors.push('文本包含二进制或解码替换字符，请检查文件和编码。');return true;}
    return false;
  }
  function uniqueContents(records){
    const groups=new Map();
    for(const r of records){const key=r.file.sha256||'unverified:'+r.file_id;
      if(!groups.has(key))groups.set(key,{sha256:r.file.sha256,record_ids:[],paths:[],variant_ids:[]});
      const g=groups.get(key);g.record_ids.push(r.file_id);g.paths.push(r.file.relative_path||r.file.name);
      if(!g.variant_ids.includes(r.variant_id))g.variant_ids.push(r.variant_id);
    }return [...groups.values()];
  }
  function reportData(state){
    const records=state.records||[];
    if(!records.some(r=>['complete','partial'].includes(r.status))&&!state.selection)throw new Error('请先导入可复核的工程报告。');
    return copy({report_kind:'engineering_review',report_version:'1.0',generated_at:new Date().toISOString(),timezone:'Asia/Shanghai',
      operation:'parse_and_review_historical_inputs',statement:'历史工程输入，本次软件解析/复核；未重新综合、运行安全分析工具或采集。',
      selected_variant:state.variant_id,source_note:state.source_note||null,records,content_groups:uniqueContents(records),
      ise_groups:state.ise_groups||[],pairings:state.pairings||[],selection:state.selection||null,
      limits:['默认时序分析不是目标频率签核。','日志完成、末条状态与过程LEAKAGE分别保留。','信息不足时不推断安全性或速度保证。']});
  }
  const labels={tool_version:'工具版本',top_module:'顶层模块',device:'器件',package:'封装',speed:'速度等级',register_count:'寄存器',lut_count:'LUT',slice_count:'Slices',bram16_count:'RAMB16BWER',bram8_count:'RAMB8BWER',period_ns:'周期',frequency_mhz:'频率估计',constraints_state:'时序约束状态',threads:'线程',model:'模型',mode:'模式',simulation_count:'模拟计数'};
  const show=x=>x===null||x===undefined?'未提供':String(x);
  function table(headers,rows){return '<div class="eng-table-wrap"><table><thead><tr>'+headers.map(x=>'<th>'+escapeHTML(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function evidenceHTML(rec){return table(['字段','值 / 单位','阶段或类型','原文位置及摘录'],Object.entries(rec.fields).map(([key,f])=>[
    escapeHTML(labels[key]||key),escapeHTML(show(f.value)+(f.unit?' '+f.unit:'')),escapeHTML(f.kind||rec.stage||''),
    'L'+f.line_start+(f.line_end!==f.line_start?'–'+f.line_end:'')+'<pre>'+escapeHTML(f.raw_text)+'</pre>']));}
  function proleadChart(rec){
    const events=(rec.events||[]).filter(x=>x.statistic_name==='-log10(p)'&&Number.isFinite(x.statistic_value));if(!events.length)return '';
    const maxX=Math.max(1,...events.map(x=>x.simulation_count)),minY=Math.min(0,...events.map(x=>x.statistic_value)),maxY=Math.max(minY+1,...events.map(x=>x.statistic_value));
    const point=x=>[(40+720*x.simulation_count/maxX).toFixed(2),(185-160*(x.statistic_value-minY)/(maxY-minY)).toFixed(2)];
    const batches=new Map();for(const x of events){if(!batches.has(x.batch_id))batches.set(x.batch_id,[]);batches.get(x.batch_id).push(x);}
    return '<p>统计量 -log10(p) · 横轴为本段模拟计数，计数重置时分段；所有真实记录点均保留。最大计数 '+maxX+'，纵轴 '+minY.toFixed(2)+' 至 '+maxY.toFixed(2)+'。</p><svg class="eng-chart" viewBox="0 0 800 210" role="img" aria-label="按真实日志点绘制的统计量过程图"><path d="M40 20V185H770" fill="none" stroke="#bcb5cc"/>'+[...batches.values()].map(xs=>'<polyline points="'+xs.map(x=>point(x).join(',')).join(' ')+'"/>').join('')+events.filter(x=>x.status==='LEAKAGE').map(x=>{const [cx,cy]=point(x);return '<circle cx="'+cx+'" cy="'+cy+'" r="2"><title>L'+x.line_number+' LEAKAGE</title></circle>';}).join('')+'</svg>';
  }
  function proleadHTML(report){
    const logs=report.records.filter(r=>r.evidence_kind==='historical_prolead_log'),groups=uniqueContents(logs),e=escapeHTML;
    if(!logs.length)return '';
    return '<section class="eng-prolead-summary"><h2>PROLEAD日志复核</h2><p>'+logs.length+' 条结果路径 / '+groups.length+' 组内容。路径数和内容数不代表独立实验次数。</p></section>'+groups.map(g=>{
      const r=logs.find(x=>x.file_id===g.record_ids[0]);const leak=r.events.filter(x=>x.status==='LEAKAGE');
      const pairings=(report.pairings||[]).filter(p=>g.record_ids.includes(p.log_id));
      return '<section class="eng-prolead-record panel panel-body" data-prolead-record="'+e(r.file_id)+'"><h2>'+e(r.file.name)+'</h2><details><summary>查看'+g.paths.length+'条输入路径</summary><ul>'+g.paths.map(p=>'<li>'+e(p)+'</li>').join('')+'</ul></details><p class="hash">SHA-256 '+e(r.file.sha256||'未校验')+'</p>'+table(['完成状态','末条状态','曾出现LEAKAGE','LEAKAGE次数','进度条目','末条模拟计数'],[[e(r.completion_state==='completed'?'已完成（存在结束文字）':'完成未确认'),e(r.last_status||'未提供'),r.ever_leakage?'是':'否（按已解析部分）',String(r.leakage_count),String(r.events.length),e(show(r.final_simulation_count))]])+'<p>模型：'+e(show(value(r,'model')))+'；工具版本：'+e(show(value(r,'tool_version')))+'；模式：'+e(show(r.mode))+'；计数分段：'+r.segment_count+'。末条状态和过程记录分别保留，不自动生成安全性结论。</p>'+pairings.map(p=>'<div class="eng-warning"><strong>配置配对未确认</strong>'+p.differences.map(d=>'<p>'+e(d.field)+'：日志 '+e(d.log_value)+'（L'+e(d.log_line)+'） / 配置 '+e(d.config_value)+'（L'+e(d.config_line)+'）</p>').join('')+p.reasons.map(x=>'<p>'+e(x)+'</p>').join('')+'</div>').join('')+proleadChart(r)+'<details class="eng-leakages"><summary>全部LEAKAGE定位（'+leak.length+'条）</summary>'+table(['原行','模拟计数','原始统计量','探针集'],leak.map(x=>['L'+x.line_number,e(x.counter_raw),e(show(x.statistic_value)),e(x.probe_set)]))+'</details><details class="eng-progress"><summary>完整进度表（'+r.events.length+'条）</summary>'+table(['原行 / 段','计数原文','统计量','状态','时间','内存','探针集'],r.events.map(x=>['L'+x.line_number+' / '+x.batch_id,e(x.counter_raw),e(show(x.statistic_value)),e(x.status),e(x.elapsed_value+' '+x.elapsed_unit),e(x.memory_value+' '+x.memory_unit),e(x.probe_set)]))+'</details>'+((r.unsupported_rows||[]).length?'<details><summary>未识别进度原文</summary>'+r.unsupported_rows.map(x=>'<pre>L'+x.line_number+' '+e(x.raw_text)+'</pre>').join('')+'</details>':'')+'</section>';
    }).join('');
  }
  function bodyHTML(report){
    const e=escapeHTML;
    return '<p class="eng-notice">'+e(report.statement)+'</p>'+
      report.ise_groups.map(g=>'<section><h2>ISE分组 · '+e(g.variant_id)+'</h2><p>关联：'+e(g.association_state)+'；缺少报告：'+e(g.missing_reports.join('、')||'无')+'</p>'+g.conflicts.map(x=>'<p>'+e(x)+'</p>').join('')+g.differences.map(x=>'<p>'+e(x.stage+' '+x.field)+'：历史工程 '+e(x.historical_value)+' / 正文基准 '+e(x.baseline_value)+'。'+e(x.reason)+'</p>').join('')+'</section>').join('')+
      selectionHTML(report.selection)+proleadHTML(report)+table(['输入','方案 / 阶段','解析状态','SHA-256'],report.records.map(r=>[e(r.file.relative_path||r.file.name),e((r.variant_id||'未确认')+' / '+(r.stage||r.mode||r.evidence_kind)),e(r.status),'<code>'+e(r.file.sha256||'未校验')+'</code>']))+
      report.records.map((r,i)=>'<section class="eng-record" data-record-id="'+e(r.file_id)+'"><h2>'+(i+1)+'. '+e(r.file.name)+'</h2><p>'+e(r.file.relative_path||'用户选择的本地文件')+' · '+e(r.parser_id)+' '+e(r.parser_version)+' · '+e(r.parsed_at)+'</p>'+((r.warnings.length||r.errors.length)?'<ul class="eng-warnings">'+[...r.errors,...r.warnings].map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>':'')+evidenceHTML(r)+'</section>').join('');
  }
  const stateLabel={satisfied:'满足所选条件',not_satisfied:'不满足',insufficient_information:'信息不足'};
  const constraintLabel={comparison_basis:'比较口径',slices:'Slices预算',lut:'LUT预算',ff:'FF预算',max_cycles:'周期数上限',max_period_ns:'周期上限',min_throughput_mbps:'吞吐下限',fresh_supply:'持续新鲜随机量',reusable_bits:'复用随机量',guard_bits:'Guard初始化',initialization:'初始化条件',guard_update:'Guard更新'};
  function selectionHTML(s){if(!s)return '';const e=escapeHTML;return '<section class="eng-selection-result"><h2>条件筛选结果</h2><p>'+e(s.statement)+'</p><details><summary>本次筛选输入</summary><pre>'+e(JSON.stringify(s.input,null,2))+'</pre></details>'+s.candidates.map(c=>'<article class="panel panel-body eng-selection-candidate" data-selection-variant="'+e(c.variant_id)+'" data-selection-state="'+e(c.state)+'"><h3>'+e(c.name)+' · '+e(stateLabel[c.state])+'</h3><p>'+e(c.source)+'；器件 '+e(c.device||'未确认')+'；阶段 '+e(c.stage)+'；FF '+e(show(c.metrics.ff))+'</p>'+(c.sha256?'<p class="hash">SHA-256 '+e(c.sha256)+'</p>':'')+table(['条件','判断','输入/比较值','限值','单位','理由及来源'],c.checks.map(x=>[e(constraintLabel[x.constraint]||x.constraint),e(stateLabel[x.state]),e(show(x.value)),e(show(x.limit)),e(x.unit),e(x.reason)+'<br>'+e(x.source)]))+(c.nominal_throughput?'<p>名义吞吐估算 '+c.nominal_throughput.value.toFixed(2)+' Mbit/s；'+e(c.nominal_throughput.formula)+'，频率 '+c.nominal_throughput.frequency_mhz+' MHz（'+e(c.nominal_throughput.frequency_source)+'）。'+e(c.nominal_throughput.cycles_source)+'；'+e(c.nominal_throughput.statement)+'</p>':'')+'</article>').join('')+'</section>';}
  const REPORT_CSS='*{box-sizing:border-box}body{margin:0;background:#f3f2f8;color:#29243c;font:14px/1.8 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1120px;background:white;margin:24px auto;padding:36px}h1{font-size:28px}h2{font-size:19px;margin-top:30px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #dedbe8;padding:9px;text-align:left;vertical-align:top}th{background:#f3f0fc}pre,code{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}pre{margin:4px 0;font-size:11px}td{overflow-wrap:anywhere}.eng-table-wrap{overflow:auto}.eng-notice{padding:14px;background:#f0edfc}.eng-warnings{color:#855900}.printbar{max-width:1120px;margin:20px auto;display:flex;justify-content:space-between;gap:12px}button{padding:10px 16px;background:#6755d5;color:white;border:0;border-radius:8px;cursor:pointer}.eng-selection-result,.eng-prolead-record{overflow-wrap:anywhere;min-width:0}.eng-chart{width:100%;height:190px}.eng-chart polyline{fill:none;stroke:#6755d5;stroke-width:1.5}.eng-chart circle{fill:#cf475d}@media(max-width:700px){main{margin:0;padding:18px}.printbar{padding:0 18px}table{min-width:620px}}@page{size:A4;margin:16mm}@media print{body{background:white}main{margin:0;padding:0;max-width:none}.printbar{display:none}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}.eng-table-wrap{overflow:visible}}';
  function buildReport(state){const report=reportData(state);return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>工程报告复核 · SCA Studio</title><style>'+REPORT_CSS+'</style></head><body><div class="printbar"><span>工程报告复核 · 可独立阅读</span><button onclick="window.print()">打印 / 另存为 PDF</button></div><main><h1>工程报告复核报告</h1><p>SSS小队 · SCA Studio · '+escapeHTML(report.generated_at)+'（ISO时间）</p>'+bodyHTML(report)+'</main></body></html>';}
  const api={VERSION,record,field,value,invalidText,uniqueContents,reportData,buildReport,bodyHTML,evidenceHTML,proleadHTML,proleadChart,selectionHTML,table,escapeHTML,show};
  root.AESEngineering=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
