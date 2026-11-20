(function (root) {
  'use strict';
  const D = root.AESData || (typeof require !== 'undefined' && require('./data.js'));
  const copy = value => JSON.parse(JSON.stringify(value));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = iso => new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso));
  const throughput = v => (128 * v.max_clock_mhz / v.cycles).toFixed(1);
  function createConfig(variantId='low-resource-ti', name='AES 轻量化门限防护评估', projectId='aes-ti-evaluation') {
    const v = typeof variantId==='string' && Object.hasOwn(D.variants,variantId) ? D.variants[variantId] : null;
    if (!v) throw new Error('不支持的防护方案');
    return {
      schema_version:D.schemaVersion, project_id:projectId, project_name:name,
      mode:'existing_results', mode_label:'AES 防护检测结果评估', selected_protection:variantId,
      raw_data_availability:{estimated_size_gb:500,included:false,required_for_current_demo:false,note:D.notes[4]},
      sources:copy(D.sources), tvla_conditions:copy(D.conditions),
      baseline:{variant_id:'unprotected',name:'未防护基线',asset_id:v.baselineAsset,source_id:'liu-2025-thesis',figure:v.baselineFigure,curve_count_reported:100000,result_kind:'literature_figure',raw_t_values:null,interpretation:'记录条件下明显超过 ±4.5 参考阈值。'},
      protected:{variant_id:v.id,name:v.name,asset_id:v.protectedAsset,source_id:'liu-2025-thesis',figure:v.protectedFigure,curve_count_reported:10000000,result_kind:'literature_figure',raw_t_values:null,interpretation:'按记录条件与样本规模，未观察到显著的一阶 TVLA 越阈。'},
      resources:{...copy(D.resourceEnvironment),variants:Object.values(D.variants).map(x=>({variant_id:x.id,slices:x.slices,lut:x.lut,ff:x.ff,bram:x.bram,cycles:x.cycles,max_clock_mhz:x.max_clock_mhz,asic_ge:x.asic_ge,fresh_random_bits_per_cycle:x.fresh_random_bits_per_cycle}))},
      comparison_notes:copy(D.notes), report_sections:['案例概述','基线结果','防护结果','检测条件','资源与性能取舍','结论范围']
    };
  }
  function presentationConfig(config) {
    const { sources, ...display } = copy(config);
    delete display.raw_data_availability.estimated_size_gb;
    delete display.tvla_conditions.source_id;
    delete display.tvla_conditions.source_section;
    for (const result of [display.baseline, display.protected]) {
      delete result.source_id;
      delete result.figure;
      result.result_kind = 'recorded_result';
    }
    delete display.resources.source_id;
    delete display.resources.table;
    return display;
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
    const check=(obj,key,expected,label,required=false)=>{if((required||key in obj)&&obj[key]!==expected)errors.push(label+'.'+key+' 与所选防护案例的内置记录不匹配。');};
    if(object(x.tvla_conditions,'tvla_conditions')) {
      for(const key of ['board','scope','order','threshold_abs_t','sampling_rate_msps','clock_mhz'])check(x.tvla_conditions,key,D.conditions[key],'tvla_conditions',true);
      for(const key of ['source_id','source_section','device','amplifier_db','tool','grouping','exact_group_counts'])check(x.tvla_conditions,key,D.conditions[key],'tvla_conditions');
    }
    for(const kind of ['baseline','protected']) {
      if(object(x[kind],kind)&&v){
        const canonical=createConfig(v.id)[kind];
        for(const key of ['variant_id','curve_count_reported'])check(x[kind],key,canonical[key],kind,true);
        for(const key of ['source_id','figure'])check(x[kind],key,canonical[key],kind);
        if(![canonical.result_kind,'recorded_result'].includes(x[kind].result_kind))errors.push(kind+'.result_kind 与内置案例不匹配。');
        check(x[kind],'raw_t_values',null,kind);
        const aliases=kind==='baseline'?['tvla-baseline',v.baselineAsset]:['tvla-protected',v.protectedAsset];
        if(!aliases.includes(x[kind].asset_id)) errors.push(kind+'.asset_id 与当前方案不匹配；应使用 '+canonical.asset_id+'。');
      }
    }
    if(object(x.resources,'resources')){
      check(x.resources,'source_id',D.resourceEnvironment.source_id,'resources');
      check(x.resources,'table',D.resourceEnvironment.table,'resources');
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
  function presentationTables() {
    return D.reportPerformanceTables.tables.map(table => ({
      id: table.id,
      title: table.title,
      headers: table.id === 'asic' ? ['方案名称', '工艺', ...table.headers.slice(1)] : ['方案名称', ...table.headers.slice(1)],
      rows: table.rows.map((row, i) => {
        const name = D.comparisonDisplayNames[table.id][i];
        if (!name) throw new Error('缺少性能对照方案名称：' + table.id + ' / ' + i);
        const values = row.slice(1).map(value => value === '0*' ? '0' : value);
        return table.id === 'asic' ? [name, row[0].endsWith('¹') ? 'UMC 180 nm' : 'NanGate 45 nm', ...values] : [name, ...values];
      }),
      notes: table.id === 'asic' ? [
        '两分量 AES（1 bit/周期）和无新鲜随机数两分量 AES 的 S 盒不满足均匀性。跨工艺结果分别解读。',
        '低随机数门限防护在计算阶段不补充新鲜随机位，初始化使用 23 bit 复用随机量和 8 bit 警卫初值。'
      ] : [
        'Spartan-6 XC6SLX75 / ISE 14.7。BRAM 以 kbit 计。',
        '低随机数门限防护在计算阶段不补充新鲜随机位，初始化使用 23 bit 复用随机量和 8 bit 警卫初值。'
      ]
    }));
  }
  function performanceTablesHTML({tableId}={}) {
    const e = escapeHTML;
    return presentationTables().filter(table => !tableId || table.id === tableId).map(table => {
      const headings = table.headers.map((h, i) => '<th scope="col"'+(i ? '' : ' class="scheme-column"')+'>'+e(h)+'</th>').join('');
      const rows = table.rows.map(([name, ...values]) => '<tr><th scope="row">'+e(name)+'</th>'+values.map(v => '<td>'+e(v)+'</td>').join('')+'</tr>').join('');
      const notes = table.notes.map(note => '<p>'+e(note)+'</p>').join('');
      const columns = '<col class="scheme-column">'+table.headers.slice(1).map(() => '<col>').join('');
      return '<div class="performance-table-block"><div class="table-scroll"><table class="performance-table" data-performance-table="'+e(table.id)+'"><caption>'+e(table.title)+'</caption><colgroup>'+columns+'</colgroup><thead><tr>'+headings+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="performance-table-notes">'+notes+'</div></div>';
    }).join('');
  }
  function referencesHTML() {
    const primary='<ol class="reference-list">'+D.references.map(reference=>'<li id="reference-'+reference.number+'" data-reference-number="'+reference.number+'"><span class="reference-number">['+reference.number+']</span><span class="reference-text">'+escapeHTML(reference.text)+'</span></li>').join('')+'</ol>';
    const comparison=(D.comparisonReferences||[]).map(reference=>'<li id="comparison-reference-'+escapeHTML(reference.id)+'" data-comparison-reference="'+escapeHTML(reference.id)+'"><span class="reference-number">['+escapeHTML(reference.label)+']</span><span class="reference-text">'+escapeHTML(reference.text)+'</span></li>').join('');
    return primary+(comparison?'<h3>性能对比文献</h3><p class="reference-intro">C 编号对应性能对照表中的具体文献，便于按作者和实现方案核对。</p><ol class="reference-list comparison-reference-list">'+comparison+'</ol>':'');
  }
  function displayAssetManifest(manifest={}) {
    return Object.fromEntries(Object.entries(manifest).map(([file,metadata])=>{
      const location=D.documentAssetLocations[file];
      const display={...metadata};
      if(location&&location.item){
        display.source=D.referenceDocument.filename;
        display.source_title=D.referenceDocument.title;
        display.pdf_page=location.pdf_page||null;
        display.printed_page=location.document_page||null;
        display.original_item=metadata.original_item||metadata.item||'';
        display.item=location.item;
        if(['structure','tvla','table'].includes(metadata.category))display.label=location.item;
      }else if(metadata.source==='毕业打印版本.pdf'){
        display.source='项目配套研究材料';
        display.source_title='项目配套研究材料';
        display.pdf_page=null;
        display.printed_page=null;
        if(location)Object.assign(display,location);
      }
      return [file,display];
    }));
  }
  function reportData(state,manifest={}) {
    if(!state.runs.baseline||!state.runs.protected||!state.compared)throw new Error('请先完成基线、防护结果加载与对比，再导出报告。');
    const checked=validateConfig(state.config);
    if(!checked.ok)throw new Error('当前配置未通过校验：'+checked.errors[0]);
    if(['baseline','protected'].some(k=>state.runs[k].selection!==state.config.selected_protection||state.runs[k].revision!==state.revision))throw new Error('结果与当前方案或配置版本不一致，请重新加载并对比。');
    return {report_version:'1.0',generated_at:new Date().toISOString(),timezone:'Asia/Shanghai',system_version:D.version,execution_mode:'existing_results',execution_description:'案例校验与既有文献图像加载',config:copy(state.config),runs:copy(state.runs),comparison:{created_at:state.comparedAt,scope:D.notes,nominal_throughput_mbps:Object.fromEntries(Object.values(D.variants).map(v=>[v.id,Number(throughput(v))])),statement:'基线在报告条件下越阈；防护在报告样本规模内未观察到显著一阶越阈。'},performance_tables:copy(D.reportPerformanceTables),comparison_references:copy(D.comparisonReferences||[]),project_document:copy(D.projectDocument||{}),reference_document:copy(D.referenceDocument),references:copy(D.references),asset_provenance:displayAssetManifest(manifest),events:copy(state.events)};
  }
  function presentationReportData(state,manifest={}) {
    const report = reportData(state,manifest);
    return {
      report_version: report.report_version,
      generated_at: report.generated_at,
      timezone: report.timezone,
      system_version: report.system_version,
      execution_mode: report.execution_mode,
      execution_description: '案例校验与既有检测结果加载',
      config: presentationConfig(report.config),
      runs: report.runs,
      comparison: report.comparison,
      performance_tables: presentationTables(),
      asset_checksums: Object.fromEntries(Object.entries(manifest).map(([file, meta]) => [file, meta.sha256])),
      events: report.events
    };
  }
  function buildReport(state,assets,manifest={}) {
    const report=reportData(state,manifest),c=report.config,v=D.variants[c.selected_protection],e=escapeHTML;
    const documentTitle='AES侧信道防护对比与报告系统项目文档';
    const figure=(file,title)=>{
      if(!assets[file])throw new Error('报告缺少图片：'+file);
      return '<figure><img src="'+assets[file]+'" alt="'+e(title)+'"><figcaption>'+e(title)+'</figcaption></figure>';
    };
    const rows=Object.values(D.variants).map(x=>'<tr><td>'+e(x.name)+'</td><td>'+x.slices+'</td><td>'+x.lut+'</td><td>'+x.ff+'</td><td>'+x.bram+'</td><td>'+x.cycles+'</td><td>'+x.max_clock_mhz+'</td><td>'+throughput(x)+'</td><td>'+x.asic_ge+'</td></tr>').join('');
    const params=[['评估模式','加载既有检测结果并对比工程指标'],['当前防护',v.name],['TVLA 平台',D.conditions.board+' / '+D.conditions.device],['测量设备',D.conditions.scope+' / 30dB 前置放大器'],['采样与工作频率','250 MS/s / 3 MHz'],['工具与检测','Vivado 2021.2 / 一阶 TVLA / 参考阈值 ±4.5'],['输入分组','固定明文组与随机明文组'],['报告曲线条数','基线 100000 条 / 防护 10000000 条'],['FPGA 资源环境','Spartan-6 XC6SLX75 / ISE 14.7'],['ASIC 环境','NanGate 45nm / Design Compiler v2016.03']];
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(documentTitle)}</title><style>${REPORT_CSS+PERFORMANCE_TABLE_CSS}</style></head><body>
<div class="printbar"><span>独立项目文档 · 图像已内嵌</span><button onclick="window.print()">打印 / 另存为 PDF</button></div><main>
<header><small>SCA STUDIO / PROJECT DOCUMENT</small><h1>${e(documentTitle)}</h1><p>${e(c.project_name)} · ${e(v.name)}</p><p class="meta">项目 ${e(c.project_id)} · 生成于 ${e(formatDate(report.generated_at))}（北京时间）</p></header>
<section><h2>方案概述与检测结果</h2><p>本系统以配置导入、基线与防护结果加载、资源性能比较和报告输出组成完整评估流程。报告汇总本项目的检测结果、工程指标与设备记录。</p><p>未防护基线在记录的 100000 条曲线条件下明显超过 ±4.5 参考阈值；${e(v.name)}在记录的 10000000 条曲线与一阶检测条件下未观察到显著越阈。</p><p>${e(v.detail)}</p></section>
<section><h2>本项目的系统实现与分析工作</h2><p>系统统一管理项目配置、方案标识、检测条件、原始图像和资源指标。结果加载包含配置与图像对应关系检查、图像解码和 SHA-256 校验；比较分析计算资源差值、相对比例及名义吞吐率；报告生成将当前选择、完整图像和软件操作记录汇总为可独立阅读的项目文档。</p></section>
<section><h2>环境与检测条件</h2><table>${params.map(r=>'<tr><th>'+e(r[0])+'</th><td>'+e(r[1])+'</td></tr>').join('')}</table></section>
<section><h2>基线与防护 TVLA 检测图</h2>${figure(v.baselineAsset,'未防护基线 · 100000 条曲线')}${figure(v.protectedAsset,v.name+' · 10000000 条曲线')}<p>检测图保留原始坐标、样本规模和判定阈值，采用固定明文与随机明文分组的一阶 Welch t 检验。</p></section>
<section><h2>资源与性能取舍</h2><div class="table-scroll"><table class="resources"><thead><tr><th>防护方案</th><th>Slices</th><th>LUT</th><th>FF</th><th>BRAM</th><th>周期</th><th>综合频率 MHz</th><th>名义 Mbit/s</th><th>ASIC GE</th></tr></thead><tbody>${rows}</tbody></table></div><p>在两种防护方案之间，低资源方案少用 17 slices，按低随机数方案为分母约减少 ${((212-195)/212*100).toFixed(1)}%；ASIC 面积少 865 GE，约减少 ${((7671-6806)/7671*100).toFixed(1)}%。</p><p>名义吞吐率按 128 × 综合频率 / 236 计算，分别约为 78.6 与 67.8 Mbit/s，采用加密核心参数口径。FPGA 资源、ASIC 面积与 TVLA 检测环境分类列示。</p><p>低资源方案采用每周期 22 比特新鲜额外随机量；低随机数方案采用 ${e(D.variants['low-randomness-ti'].initialization)} 资源表中的额外新鲜随机数按每周期口径列示。</p>${performanceTablesHTML()}</section>
<section><h2>项目设备与采集材料</h2>${figure('hardware-photo.jpg','项目设备与连接照片')}${figure('acquisition.png','项目采集界面记录')}<p>设备连接画面展示 SAKURA-X、Xilinx 下载线与 PicoScope 5000 Series。采集界面记录 250 MS/s、20000 采样点、10000000 条完成计数及 100% 进度，形成设备、采集参数与操作记录相配套的材料展示。</p></section>
<section><h2>当前方案结构</h2>${figure(v.sboxAsset,v.name+' S盒结构')}${figure(v.aesAsset,v.name+' AES 数据通路')}<p>两种方案以两分量门限实现为基础，通过寄存器分层、逻辑优化与随机量组织形成不同的资源配置。加密核心均采用 236 个周期的串行数据通路。</p></section>
<section><h2>比较口径</h2><p>FPGA 与 ASIC 指标分别列示。比较时核对工艺、周期和持续随机量的统计条件。软件从已记录的实验结果生成对比。</p></section>
<section><h2>本次软件执行记录</h2><table><tr><th>操作</th><th>完成时间（北京时间）</th><th>执行范围</th></tr>${['baseline','protected'].map(k=>'<tr><td>'+e(k==='baseline'?'加载未防护基线':'加载防护结果')+'</td><td>'+e(formatDate(report.runs[k].completed_at))+'</td><td>'+e(report.runs[k].verification)+'</td></tr>').join('')}<tr><td>生成对比</td><td>${e(formatDate(report.comparison.created_at))}</td><td>汇总当前案例与工程指标</td></tr></table><p>本节时间对应网页软件操作记录。</p></section>
<section><h2>结论范围</h2><p>一阶检测结论对应所列采集条件和样本规模。工程复核的面积判定以指定器件及 PAR 阶段为口径。低随机数方案在计算前输入 23 bit 复用随机量和 8 bit 警卫初值，计算时按设计复用及更新。</p><p class="meta">系统版本 ${e(D.version)} · 配置版本 ${e(c.schema_version)}</p></section></main></body></html>`;
  }
  const REFERENCE_CSS='.reference-list{list-style:none;margin:16px 0;padding:0}.reference-list li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:6px;margin:12px 0;line-height:1.85;break-inside:avoid;page-break-inside:avoid}.reference-number{font-variant-numeric:tabular-nums}.reference-text{overflow-wrap:anywhere}.bibliography-panel{padding:24px;margin-bottom:24px}.bibliography-panel h2{font-size:18px;margin:0 0 8px}.bibliography-panel .reference-list{font-size:13px;color:#4c485c}.reference-intro{font-size:12px;color:#777085;line-height:1.8}.report-sheet .reference-list{font-size:11px;color:#5f586f}.report-sheet .reference-list li{grid-template-columns:28px minmax(0,1fr)}.supporting-materials{font-size:12px}@media print{.reference-list{font-size:9pt}.reference-list li{margin:9px 0;grid-template-columns:28px minmax(0,1fr)}}';
  const PERFORMANCE_TABLE_CSS='.performance-table-block{margin:26px 0;break-inside:avoid;page-break-inside:avoid}.performance-table-block .table-scroll{overflow-x:auto}table.performance-table{width:100%;min-width:700px;table-layout:fixed;border-collapse:collapse;font-size:12px;line-height:1.5}.performance-table caption{caption-side:top;padding:0 0 12px;text-align:center;color:#242631;font-size:16px;font-weight:500}.performance-table .scheme-column{width:22%}.performance-table th,.performance-table td{border:1px solid #535563;padding:7px 8px;vertical-align:middle;text-align:center;overflow-wrap:normal;word-break:normal;background:white}.performance-table thead th{font-weight:500}.performance-table th[scope=row]{text-align:left;font-weight:400}.performance-table-note{font-size:11px;color:#656878;line-height:1.8}@media print{table.performance-table{min-width:0;font-size:9pt}.performance-table caption{font-size:11pt}.performance-table td,.performance-table th{padding:5px 4px}.performance-table-block .table-scroll{overflow:visible}.performance-table-note{font-size:8pt}}';
  const REPORT_CSS='*{box-sizing:border-box}body{margin:0;color:#242631;background:#f1f2f6;font:15px/1.8 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1000px;margin:36px auto;padding:56px 64px;background:white}header{padding-bottom:24px;border-bottom:2px solid #6755d5}small{color:#6755d5;letter-spacing:2px}h1{font-size:30px;line-height:1.4}h2{font-size:20px;margin:30px 0 12px}section{margin:24px 0}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #dedee8;padding:10px;text-align:left;overflow-wrap:anywhere}th{background:#f1effc}figure{margin:24px 0;break-inside:avoid}figure img{display:block;max-width:100%;height:auto;margin:auto}figcaption{font-size:11px;color:#656878;text-align:center;overflow-wrap:anywhere}.meta{font-size:12px;color:#656878}li{margin:8px 0}.printbar{display:flex;justify-content:space-between;gap:12px;max-width:1000px;margin:24px auto}button{border:0;border-radius:6px;padding:10px 18px;background:#6755d5;color:white;cursor:pointer}.table-scroll{overflow:auto}@media(max-width:700px){main{margin:0;padding:24px}.printbar{padding:0 20px}table{min-width:450px}.resources{min-width:720px}section{overflow:auto}}@page{size:A4;margin:18mm}@media print{body{background:white;font-size:10pt}main{padding:0;margin:0;max-width:none}.printbar{display:none}h2{break-after:avoid}figure{page-break-inside:avoid}figure img{max-height:190mm;object-fit:contain}thead{display:table-header-group}tr{break-inside:avoid}.table-scroll{overflow:visible}a{color:inherit}}';
  function engineeringModule(){return root.AESEngineering||(typeof require==='function'?require('./engineering.js'):null);}
  function engineeringReportData(state){return engineeringModule().reportData(state);}
  function buildEngineeringReport(state){return engineeringModule().buildReport(state);}
  const api={presentationConfig,presentationReportData,presentationTables,createConfig,validateConfig,newState,selectVariant,reportData,buildReport,engineeringReportData,buildEngineeringReport,performanceTablesHTML,referencesHTML,displayAssetManifest,escapeHTML,formatDate,throughput};
  root.AESCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
