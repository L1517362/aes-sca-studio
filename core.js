(function (root) {
  'use strict';
  const D = root.AESData || (typeof require !== 'undefined' && require('./data.js'));
  const copy = value => JSON.parse(JSON.stringify(value));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = iso => new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso));
  const throughput = v => (128 * v.max_clock_mhz / v.cycles).toFixed(1);
  function createConfig(variantId='low-resource-ti', name='AES 轻量化门限防护评估', projectId='aes-ti-literature-demo') {
    const v = typeof variantId==='string' && Object.hasOwn(D.variants,variantId) ? D.variants[variantId] : null;
    if (!v) throw new Error('不支持的防护方案');
    return {
      schema_version:D.schemaVersion, project_id:projectId, project_name:name,
      mode:'existing_results', mode_label:'已有文献结果案例演示', selected_protection:variantId,
      raw_data_availability:{estimated_size_gb:500,included:false,required_for_current_demo:false,note:D.notes[4]},
      sources:copy(D.sources), tvla_conditions:copy(D.conditions),
      baseline:{variant_id:'unprotected',name:'未防护基线',asset_id:v.baselineAsset,source_id:'liu-2025-thesis',figure:v.baselineFigure,curve_count_reported:100000,result_kind:'literature_figure',raw_t_values:null,interpretation:'原文条件下明显超过 ±4.5 参考阈值。'},
      protected:{variant_id:v.id,name:v.name,asset_id:v.protectedAsset,source_id:'liu-2025-thesis',figure:v.protectedFigure,curve_count_reported:10000000,result_kind:'literature_figure',raw_t_values:null,interpretation:'按原文条件与样本规模，未观察到显著的一阶 TVLA 越阈。'},
      resources:{...copy(D.resourceEnvironment),variants:Object.values(D.variants).map(x=>({variant_id:x.id,slices:x.slices,lut:x.lut,ff:x.ff,bram:x.bram,cycles:x.cycles,max_clock_mhz:x.max_clock_mhz,asic_ge:x.asic_ge,fresh_random_bits_per_cycle:x.fresh_random_bits_per_cycle}))},
      comparison_notes:copy(D.notes), report_sections:['案例与来源','基线结果','防护结果','测试条件','资源与性能取舍','结论范围','引用材料']
    };
  }
  function validateConfig(input) {
    const errors=[];
    let x=input;
    if(typeof x==='string') {try{x=JSON.parse(x.replace(/^\uFEFF/,''));}catch{ return {ok:false,errors:['配置不是有效的 JSON，请检查引号、逗号和括号。']}; }}
    if(!x || typeof x!=='object' || Array.isArray(x)) return {ok:false,errors:['配置顶层必须是一个 JSON 对象。']};
    for(const key of ['schema_version','project_id','project_name','mode','selected_protection','tvla_conditions','baseline','protected','resources']) if(!(key in x))errors.push('缺少必要字段：'+key);
    if(!['1.0','1.1'].includes(x.schema_version))errors.push('schema_version 仅支持 1.0 或 1.1。');
    if(x.mode!=='existing_results')errors.push('当前版本仅支持 existing_results（已有结果案例）；请导入对应配置。');
    for(const [key,max] of [['project_name',100],['project_id',80]])if(typeof x[key]!=='string'||!x[key].trim()||x[key].length>max)errors.push(key+' 需为 1–'+max+' 个字符的文本。');
    const v=typeof x.selected_protection==='string' && Object.hasOwn(D.variants,x.selected_protection) ? D.variants[x.selected_protection] : null;
    if(!v)errors.push('selected_protection 必须是 low-resource-ti 或 low-randomness-ti。');
    const object=(value,label)=> {if(!value||typeof value!=='object'||Array.isArray(value)){errors.push(label+' 必须是对象。');return false;}return true;};
    const check=(obj,key,expected,label,required=false)=>{if((required||key in obj)&&obj[key]!==expected)errors.push(label+'.'+key+' 应为 '+String(expected)+'，以匹配所选文献案例。');};
    if(object(x.tvla_conditions,'tvla_conditions')) {
      for(const key of ['source_id','board','scope','order','threshold_abs_t','sampling_rate_msps','clock_mhz'])check(x.tvla_conditions,key,D.conditions[key],'tvla_conditions',true);
      for(const key of ['source_section','device','amplifier_db','tool','grouping','exact_group_counts'])check(x.tvla_conditions,key,D.conditions[key],'tvla_conditions');
    }
    for(const kind of ['baseline','protected']) {
      if(object(x[kind],kind)&&v){
        const canonical=createConfig(v.id)[kind];
        for(const key of ['variant_id','source_id','figure','curve_count_reported','result_kind'])check(x[kind],key,canonical[key],kind,true);
        check(x[kind],'raw_t_values',null,kind);
        const aliases=kind==='baseline'?['tvla-baseline',v.baselineAsset]:['tvla-protected',v.protectedAsset];
        if(!aliases.includes(x[kind].asset_id)) errors.push(kind+'.asset_id 与当前方案不匹配；应使用 '+canonical.asset_id+'。');
      }
    }
    if(object(x.resources,'resources')){
      check(x.resources,'source_id','liu-2025-thesis','resources',true);
      check(x.resources,'table','5.4','resources',true);
      if('platform' in x.resources&&!['Spartan-6','Spartan-6 XC6SLX75'].includes(x.resources.platform))errors.push('资源平台应为 Spartan-6 XC6SLX75。');
      if(!Array.isArray(x.resources.variants)||x.resources.variants.length!==2)errors.push('resources.variants 应包含两种防护方案。');
      else{
        const seen=new Set();
        for(const record of x.resources.variants){
          if(!object(record,'资源条目'))continue;
          const expected=typeof record.variant_id==='string' && Object.hasOwn(D.variants,record.variant_id) ? D.variants[record.variant_id] : null;
          if(!expected||seen.has(record.variant_id)){errors.push('资源条目的方案标识无效或重复。');continue;} seen.add(record.variant_id);
          for(const key of ['slices','cycles','max_clock_mhz'])check(record,key,expected[key],'resources.'+record.variant_id,true);
          for(const key of ['lut','ff','bram','asic_ge','fresh_random_bits_per_cycle'])check(record,key,expected[key],'resources.'+record.variant_id);
        }
      }
    }
    if('raw_data_availability' in x&&object(x.raw_data_availability,'raw_data_availability')){
      check(x.raw_data_availability,'included',false,'raw_data_availability');
      check(x.raw_data_availability,'required_for_current_demo',false,'raw_data_availability');
    }
    if(errors.length)return {ok:false,errors};
    return {ok:true,errors:[],config:createConfig(v.id,x.project_name.trim(),x.project_id.trim()),migrated:x.schema_version==='1.0'};
  }
  function newState(config=createConfig()) {return {config:copy(config),revision:0,runs:{baseline:null,protected:null},compared:false,comparedAt:null,exportedAt:null,events:[]};}
  function selectVariant(state,id) {
    return {...state,config:createConfig(id,state.config.project_name,state.config.project_id),revision:state.revision+1,runs:{baseline:null,protected:null},compared:false,comparedAt:null,exportedAt:null};
  }
  function performanceTablesHTML() {
    const e=escapeHTML,tables=D.reportPerformanceTables;
    return tables.tables.map(table=>'<div class="performance-table-block"><div class="table-scroll"><table class="performance-table" data-performance-table="'+e(table.id)+'"><caption>表 '+e(table.number)+'　'+e(table.title)+'</caption><colgroup><col class="scheme-column">'+table.headers.slice(1).map(()=>'<col>').join('')+'</colgroup><thead><tr>'+table.headers.map((header,index)=>'<th scope="col"'+(index===0?' class="scheme-column"':'')+'>'+e(header)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map((cell,index)=>index===0?'<th scope="row">'+e(cell)+'</th>':'<td>'+e(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>').join('')+'<p class="performance-table-note">按项目文档第 '+tables.source.document_page+' 页整理。'+e(tables.scheme_note)+'</p>';
  }
  function reportData(state,manifest={}) {
    if(!state.runs.baseline||!state.runs.protected||!state.compared)throw new Error('请先完成基线、防护结果加载与对比，再导出报告。');
    const checked=validateConfig(state.config);
    if(!checked.ok)throw new Error('当前配置未通过校验：'+checked.errors[0]);
    if(['baseline','protected'].some(k=>state.runs[k].selection!==state.config.selected_protection||state.runs[k].revision!==state.revision))throw new Error('结果与当前方案或配置版本不一致，请重新加载并对比。');
    return {report_version:'1.0',generated_at:new Date().toISOString(),timezone:'Asia/Shanghai',system_version:D.version,execution_mode:'existing_results',execution_description:'案例校验与既有文献图像加载',config:copy(state.config),runs:copy(state.runs),comparison:{created_at:state.comparedAt,scope:D.notes,nominal_throughput_mbps:Object.fromEntries(Object.values(D.variants).map(v=>[v.id,Number(throughput(v))])),statement:'基线在报告条件下越阈；防护在报告样本规模内未观察到显著一阶越阈。'},performance_tables:copy(D.reportPerformanceTables),asset_provenance:copy(manifest),events:copy(state.events)};
  }
  function buildReport(state,assets,manifest={}) {
    const report=reportData(state,manifest),c=report.config,v=D.variants[c.selected_protection],e=escapeHTML;
    const tableSource=D.reportPerformanceTables.source;
    const reportSources=D.sources.map(source=>source.id==='liu-2025-thesis'?{...source,author:'项目提供材料',title:'AES 侧信道防护研究参考资料（REF-01）',note:'理论、结构、TVLA 图像及原始资源参数的既有研究参考资料。'}:source);
    const figure=(file,title)=>{if(!assets[file])throw new Error('报告缺少图片：'+file);const m=manifest[file]||{};return '<figure><img src="'+assets[file]+'" alt="'+e(title)+'"><figcaption>'+e(title)+' · '+e(m.item||'')+(m.pdf_page?' · 研究参考资料 PDF 第 '+e(m.pdf_page)+' 页':' · 项目提供材料')+'<br>SHA-256 '+e(m.sha256||'未记录')+'</figcaption></figure>';};
    const rows=Object.values(D.variants).map(x=>'<tr><td>'+e(x.name)+'</td><td>'+x.slices+'</td><td>'+x.lut+'</td><td>'+x.ff+'</td><td>'+x.bram+'</td><td>'+x.cycles+'</td><td>'+x.max_clock_mhz+'</td><td>'+throughput(x)+'</td><td>'+x.asic_ge+'</td></tr>').join('');
    const params=[['案例模式','已有文献结果案例演示'],['当前防护',v.name],['TVLA 平台',D.conditions.board+' / '+D.conditions.device],['测量设备',D.conditions.scope+' / 30dB 前置放大器'],['采样与工作频率','250 MS/s / 3 MHz'],['工具与检测','Vivado 2021.2 / 一阶 TVLA / 参考阈值 ±4.5'],['输入分组','固定明文组与随机明文组；两组精确条数未提供'],['报告曲线条数','基线 100000 条 / 防护 10000000 条'],['FPGA 资源环境','Spartan-6 XC6SLX75 / ISE 14.7 / 资源记录表 5.4'],['ASIC 环境','NanGate 45nm / Design Compiler v2016.03 / 资源记录表 5.3']];
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(c.project_name)+' · 对比报告</title><style>'+REPORT_CSS+PERFORMANCE_TABLE_CSS+'</style></head><body><div class="printbar"><span>独立报告 · 图片与来源已内嵌</span><button onclick="window.print()">打印 / 另存为 PDF</button></div><main><header><small>SCA STUDIO / CASE REPORT</small><h1>AES 侧信道防护对比报告</h1><p>'+e(c.project_name)+' · '+e(v.name)+'</p><p class="meta">项目 '+e(c.project_id)+' · 生成于 '+e(formatDate(report.generated_at))+'（北京时间）</p></header><section><h2>案例结论与适用范围</h2><p>本报告围绕当前防护方案，汇总研究参考结果、项目提供的实验材料与本系统完成的对比分析。研究参考曲线的原始来源集中列于文末。未防护基线在报告的 100000 条曲线条件下明显超过 ±4.5 参考阈值；'+e(v.name)+'在报告的 10000000 条曲线条件下未观察到显著的一阶越阈。图像加载和配置校验由本系统完成，曲线未在本次运行中重新采集或计算。</p><p>'+e(v.detail)+'</p></section><section><h2>本项目的系统实现与分析工作</h2><p>本系统将项目配置、方案标识、检测条件、原始图像和资源指标关联到同一案例。运行时完成配置与图像对应关系检查、图像解码和可用条件下的 SHA-256 校验；对比时计算资源差值、相对比例及名义吞吐率；导出时将当前选择、图像和执行记录组织为独立报告。</p><p>这些软件实现与比较分析是本项目在当前版本中完成的工作。引用研究的电路构造、检测曲线和综合参数作为参考依据，不计为本项目新增的硬件测量。</p></section><section><h2>环境与检测条件</h2><table>'+params.map(r=>'<tr><th>'+e(r[0])+'</th><td>'+e(r[1])+'</td></tr>').join('')+'</table></section><section><h2>基线与防护 TVLA 原图</h2>'+figure(v.baselineAsset,'未防护基线 · 100000 条曲线')+figure(v.protectedAsset,v.name+' · 10000000 条曲线')+'<p>两张原图的样本规模和纵轴范围不同，保留原坐标、阈值及图注。未提供逐点 t 值、最大 |t|、CPA/DPA 成功率或完整轨迹，报告不据截图估算这些指标。</p></section><section><h2>资源与性能取舍</h2><div class="table-scroll"><table class="resources"><thead><tr><th>防护方案</th><th>Slices</th><th>LUT</th><th>FF</th><th>BRAM</th><th>周期</th><th>最高 MHz</th><th>名义 Mbit/s</th><th>ASIC GE</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>两种防护方案之间，低资源方案少用 17 slices，按低随机数方案为分母约减少 '+((212-195)/212*100).toFixed(1)+'%；ASIC 面积少 865 GE，约减少 '+((7671-6806)/7671*100).toFixed(1)+'%。这些差值不表示相对未防护实现的开销。</p><p>名义吞吐率 = 128 × 最高综合频率 / 236，分别约为 78.6 与 67.8 Mbit/s，不计通信和随机源开销，属于由文献参数计算的估算。FPGA 资源环境与 TVLA 测量环境分别记录。</p><p>低资源方案：'+e(D.variants['low-resource-ti'].randomness)+'。低随机数方案：'+e(D.variants['low-randomness-ti'].initialization)+' 原表额外新鲜随机数列为 0，不表示完全不需要随机性。</p>'+performanceTablesHTML()+'</section><section><h2>项目设备与采集材料</h2>'+figure('hardware-photo.jpg','项目提供的实验设备与连接照片')+figure('acquisition.png','项目提供的采集界面记录')+'<p>设备照片可辨认 SAKURA-X、Xilinx 下载线与 PicoScope 5000 Series。采集界面记录 250M、20000 点、10000000 条完成计数及 100% 进度。这些材料说明设备与采集记录的形式；其采集日期及与参考 TVLA 曲线的对应关系未在当前材料中记录。</p></section><section><h2>当前方案结构</h2>'+figure(v.sboxAsset,v.name+' S盒结构')+figure(v.aesAsset,v.name+' AES 数据通路')+'</section><section><h2>条件差异与结论边界</h2><ul>'+D.notes.map(n=>'<li>'+e(n)+'</li>').join('')+'</ul><p>公开参考论文 New First-Order Secure AES Performance Records 表 3 的字节串行条目为 203 slices、476 LUT、529 Reg、108 kbit BRAM、216 周期、138 MHz、81.7 Mbit/s、8 比特随机量，包含 PRNG 与 key masking。与当前资源记录的 PRNG 计入口径仍需工程核对，不作统一重新综合结论。</p></section><section><h2>本次软件执行记录</h2><table><tr><th>操作</th><th>完成时间（北京时间）</th><th>执行范围</th></tr>'+['baseline','protected'].map(k=>'<tr><td>'+e(k==='baseline'?'加载未防护基线':'加载防护结果')+'</td><td>'+e(formatDate(report.runs[k].completed_at))+'</td><td>'+e(report.runs[k].verification)+'</td></tr>').join('')+'<tr><td>生成对比</td><td>'+e(formatDate(report.comparison.created_at))+'</td><td>合并当前选择的案例与文献资源参数</td></tr></table><p>本节时间为网页软件操作时间。软件图像加载耗时不代表加密时延、采集耗时或硬件性能。</p></section><section><h2>附录 数据来源与引用材料</h2><p>曲线与主要综合参数为既有研究报告结果，未将原始轨迹视为已公开数据集；设备照片与采集截图为项目提供的实验材料。来源记录用于核对引用数据，报告主体中的软件实现、比较计算和执行记录由本系统生成。</p><ol>'+reportSources.map(s=>'<li>'+e(s.author)+'. '+e(s.title)+(s.year?' ('+s.year+')':'')+'. '+e(s.note)+(s.url?' <a href="'+e(s.url)+'">'+e(s.url)+'</a>':'')+'</li>').join('')+'</ol><p class="meta">性能对照表来源：'+e(tableSource.filename)+' · 文档第 '+tableSource.document_page+' 页（PDF 第 '+tableSource.pdf_page+' 页） · 表 3-1 / 表 3-2。<br>SHA-256 '+e(tableSource.sha256)+'</p><p class="meta">软件版本 '+e(D.version)+' · 配置版本 '+e(c.schema_version)+' · 原图校验信息随图保留。报告可脱离系统独立打开。</p></section></main></body></html>';
  }
  const PERFORMANCE_TABLE_CSS='.performance-table-block{margin:26px 0;break-inside:avoid;page-break-inside:avoid}.performance-table-block .table-scroll{overflow-x:auto}table.performance-table{width:100%;min-width:700px;table-layout:fixed;border-collapse:collapse;font-size:12px;line-height:1.5}.performance-table caption{caption-side:top;padding:0 0 12px;text-align:center;color:#242631;font-size:16px;font-weight:500}.performance-table .scheme-column{width:22%}.performance-table th,.performance-table td{border:1px solid #535563;padding:7px 8px;vertical-align:middle;text-align:center;overflow-wrap:normal;word-break:normal;background:white}.performance-table thead th{font-weight:500}.performance-table th[scope=row]{text-align:left;font-weight:400}.performance-table-note{font-size:11px;color:#656878;line-height:1.8}@media print{table.performance-table{min-width:0;font-size:9pt}.performance-table caption{font-size:11pt}.performance-table td,.performance-table th{padding:5px 4px}.performance-table-block .table-scroll{overflow:visible}.performance-table-note{font-size:8pt}}';
  const REPORT_CSS='*{box-sizing:border-box}body{margin:0;color:#242631;background:#f1f2f6;font:15px/1.8 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1000px;margin:36px auto;padding:56px 64px;background:white}header{padding-bottom:24px;border-bottom:2px solid #6755d5}small{color:#6755d5;letter-spacing:2px}h1{font-size:30px;line-height:1.4}h2{font-size:20px;margin:30px 0 12px}section{margin:24px 0}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #dedee8;padding:10px;text-align:left;overflow-wrap:anywhere}th{background:#f1effc}figure{margin:24px 0;break-inside:avoid}figure img{display:block;max-width:100%;height:auto;margin:auto}figcaption{font-size:11px;color:#656878;text-align:center;overflow-wrap:anywhere}.meta{font-size:12px;color:#656878}li{margin:8px 0}.printbar{display:flex;justify-content:space-between;gap:12px;max-width:1000px;margin:24px auto}button{border:0;border-radius:6px;padding:10px 18px;background:#6755d5;color:white;cursor:pointer}.table-scroll{overflow:auto}@media(max-width:700px){main{margin:0;padding:24px}.printbar{padding:0 20px}table{min-width:450px}.resources{min-width:720px}section{overflow:auto}}@page{size:A4;margin:18mm}@media print{body{background:white;font-size:10pt}main{padding:0;margin:0;max-width:none}.printbar{display:none}h2{break-after:avoid}figure{page-break-inside:avoid}figure img{max-height:190mm;object-fit:contain}thead{display:table-header-group}tr{break-inside:avoid}.table-scroll{overflow:visible}a{color:inherit}}';
  const api={createConfig,validateConfig,newState,selectVariant,reportData,buildReport,performanceTablesHTML,escapeHTML,formatDate,throughput};
  root.AESCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
