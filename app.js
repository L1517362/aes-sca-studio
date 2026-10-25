/* The UI, comparison and exports all read the same canonical case record. */
(function () {
  'use strict';
  const D=window.AESData, C=window.AESCore, A=window.AESAssets, M=window.AESCore.displayAssetManifest(window.AESAssetManifest);
  const e=C.escapeHTML, $=selector=>document.querySelector(selector);
  const STORAGE_KEY='sca-studio:config:1.1';
  const projectDocumentTitle='AES侧信道防护对比与报告系统项目文档';
  const routeNames={workspace:'评估工作台',config:'项目配置',compare:'结果对比',theory:'理论与结构',hardware:'硬件与采集',sources:'案例与来源',reports:'报告中心'};
  const paths={
    shield:'M12 3 3.5 7v5c0 5 8.5 10 8.5 10s8.5-5 8.5-10V7L12 3ZM7 13h3l1.5-4 2 8 1.5-4h2',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    folder:'M3 7V5h6l2 3h10v12H3V7ZM3 10h18',
    compare:'M8 3v18M16 3v18M4 7l4-4 4 4M12 17l4 4 4-4',
    layers:'m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
    cpu:'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',
    book:'M12 5C8 2 3 3 2 4v15c3-2 7-2 10 0m0-14c4-3 9-2 10-1v15c-3-2-7-2-10 0V5Z',
    report:'M5 3h10l4 4v14H5V3Zm9 0v5h5M8 12h8m-8 4h6',
    upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    download:'M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6',
    play:'m8 4 12 8-12 8V4Z', check:'m5 12 4 4L19 6', arrow:'M4 12h16m-5-5 5 5-5 5',
    chevron:'m9 5 7 7-7 7', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
    info:'M12 8h.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    activity:'M2 12h5l3-8 4 16 3-8h5', lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
    clock:'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    target:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    search:'M15.5 15.5 21 21M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18', menu:'M3 6h18M3 12h18M3 18h18',
    refresh:'M20 8A9 9 0 1 0 21 15M20 3v5h-5', link:'m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m-1 8a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2',
    help:'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 4m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
  };
  const icon=name=>'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.grid)+'"/></svg>';
  const button=(label,action,style='',disabled=false,extra='')=>'<button class="button '+style+'" data-action="'+action+'" '+(disabled?'disabled ':'')+extra+'>'+label+'</button>';
  const chip=(text,color='gray')=>'<span class="chip '+color+'">'+e(text)+'</span>';
  let state=C.newState();
  let restored=false;
  try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const r=C.validateConfig(saved);if(r.ok){state=C.newState(r.config);restored=true;}}}catch{/* A private browser session can still run entirely in memory. */}
  const ui={route:routeNames[location.hash.slice(1)]?location.hash.slice(1):'workspace',busy:null,errors:[],hardwareTab:'现场与采集',search:'',filter:'all',viewerFile:null,zoom:1};
  let toastTimer;
  const objectURLs=new Set();
  function log(message,type='info'){state.events.unshift({at:new Date().toISOString(),message,type,variant:state.config.selected_protection});state.events=state.events.slice(0,60);}
  log(restored?'已恢复上次项目配置；运行状态等待本次校验。':'已载入内置文献案例，等待结果校验与加载。');
  function toast(message,error=false){const node=$('#toast');clearTimeout(toastTimer);node.textContent=message;node.className='toast visible'+(error?' error':'');toastTimer=setTimeout(()=>node.className='toast',4800);}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.config));}catch{toast('浏览器未允许本地保存；当前会话仍可使用全部功能。');}}
  function navigate(route){if(!routeNames[route])route='workspace';ui.route=route;location.hash=route;render();window.scrollTo({top:0,behavior:'instant'});}
  function current(){return D.variants[state.config.selected_protection];}
  function assetTitle(file){const meta=M[file]||{};return meta.label||meta.item||file;}
  function assetSource(file){const meta=M[file]||{};if(D.documentAssetLocations[file]?.item)return projectDocumentTitle;return (meta.source_title||meta.source||'项目材料')+(meta.item?' · '+meta.item:'');}
  function assetCaption(file){const meta=M[file]||{};const categories={structure:'方案结构图',tvla:'检测结果图',formula:'技术公式',table:'资源数据表',hardware:'设备与采集材料'};return (categories[meta.category]||'案例材料')+(meta.item?' · '+meta.item:'');}
  function image(file,title='',extraClass=''){
    if(!A[file])return '<p class="muted">缺少图片：'+e(file)+'</p>';
    return '<button class="figure-button '+extraClass+'" data-action="view-image" data-file="'+e(file)+'" aria-label="放大查看'+e(title||assetTitle(file))+'"><img src="'+A[file]+'" alt="'+e(title||assetTitle(file))+'" loading="lazy"><span class="figure-zoom">'+icon('expand')+'</span></button>';
  }
  function header(title,description,actions=''){return '<header class="page-header"><div><div class="eyebrow">AES SIDE-CHANNEL EVALUATION</div><h1>'+e(title)+'</h1><p>'+e(description)+'</p></div><div class="header-actions">'+actions+'</div></header>';}
  function banner(text){return '<div class="info-banner">'+icon('info')+'<div>'+text+'</div></div>';}
  function section(title,description='',right=''){return '<div class="section-heading"><div><h2>'+e(title)+'</h2>'+(description?'<p>'+e(description)+'</p>':'')+'</div>'+right+'</div>';}
  function shell(content){
    const nav=[['workspace','grid'],['config','folder'],['compare','compare'],['theory','layers'],['hardware','cpu'],['sources','book'],['reports','report']];
    return '<div class="app-layout"><aside class="sidebar" id="sidebar"><a class="brand" href="#workspace" aria-label="SCA Studio 评估工作台"><span class="brand-symbol">'+icon('shield')+'</span><div><div class="brand-name">SCA Studio<span style="color:#bcb1df">.</span></div><div class="brand-subtitle">硬件安全 · 案例评估工作台</div></div></a><div class="nav-label">WORKSPACE / 工作空间</div><nav aria-label="主要导航">'+nav.map(([id,i])=>'<button class="nav-item '+(ui.route===id?'active':'')+'" data-action="navigate" data-route="'+id+'" '+(ui.route===id?'aria-current="page"':'')+'>'+icon(i)+'<span>'+routeNames[id]+'</span>'+(id==='sources'?'<span class="nav-count">'+Object.keys(M).length+'</span>':'')+'</button>').join('')+'</nav><div class="sidebar-bottom"><div class="local-card"><div class="local-title"><span class="status-dot"></span> 本地案例模式</div><p>数据保留在当前浏览器<br>依据已有文献与实验材料展示</p></div><div class="sidebar-footer"><span>SCA STUDIO</span><span>v'+D.version+'</span></div></div></aside><div class="mobile-overlay" data-action="close-menu"></div><div class="body-shell"><div class="topbar"><div class="breadcrumb"><button class="mobile-menu" data-action="toggle-menu" aria-label="展开导航">'+icon('menu')+'</button><span>工作空间</span>'+icon('chevron')+'<strong>'+routeNames[ui.route]+'</strong></div><div class="topbar-right"><span class="topbar-tag"><span class="status-dot"></span>已有结果 · 本地展示</span><span class="top-divider"></span><button class="help-button" data-action="navigate" data-route="sources">'+icon('help')+'资料说明</button><span class="avatar" title="AES-128 案例">AES</span></div></div><main class="content" id="main" tabindex="-1">'+content+'<footer class="footer"><span>'+icon('lock')+' 本地运行 · 无需账户 · 支持离线使用</span><span>图表可追溯 · 方案可比较 · SCA Studio v'+D.version+'</span></footer></main></div></div>';
  }
  function workflow(){
    const done=[true,!!state.runs.baseline,!!state.runs.protected,state.compared,!!state.exportedAt];
    const names=['导入项目配置','运行未防护基线','运行防护版本','对比结果','导出报告'];
    const actions=['open-import','run-baseline','run-protected','compare','go-reports'];
    const notes=['案例已就绪','校验并加载原图','加载当前防护方案','检测现象与资源','图像与来源随附'];
    const first=done.findIndex(x=>!x);
    return '<div class="panel step-panel"><div class="panel-head"><h2>评估流程</h2>'+chip(done.filter(Boolean).length+' / 5 步就绪','purple')+'</div><div class="workflow">'+names.map((name,i)=>'<button class="step '+(done[i]?'done':i===first?'current':'')+'" data-action="'+actions[i]+'" '+(ui.busy?'disabled':'')+'><span class="step-circle">'+(done[i]?icon('check'):String(i+1).padStart(2,'0'))+'</span><span><span class="step-title">'+name+'</span><span class="step-note">'+notes[i]+'</span></span></button>').join('')+'</div><div class="workflow-footer"><span>'+icon('info')+'运行操作用于校验与加载已有案例结果</span><span class="mode-detail">'+icon('book')+' AES-128 · 一阶 TVLA 案例</span></div></div>';
  }
  function variantCards(){return '<div class="scheme-grid">'+Object.values(D.variants).map(v=>'<button class="scheme-card '+(current().id===v.id?'selected':'')+'" data-action="select-variant" data-id="'+v.id+'" aria-pressed="'+(current().id===v.id)+'" '+(ui.busy?'disabled':'')+'><span class="scheme-marker">'+(current().id===v.id?icon('check'):'')+'</span><div class="scheme-label">'+v.english+'</div><h3>'+v.name+'</h3><p>'+v.description+'</p><div class="scheme-meta"><span><b>'+v.slices+'</b> slices</span><span><b>'+v.max_clock_mhz+'</b> MHz</span><span><b>'+v.fresh_random_bits_per_cycle+'</b> bit / 周期*</span></div></button>').join('')+'</div>';}
  function resultCard(kind){
    const v=current(),baseline=kind==='baseline',run=state.runs[kind],file=baseline?v.baselineAsset:v.protectedAsset;
    const count=baseline?'100,000':'10,000,000',title=baseline?'未防护基线':v.name;
    return '<article class="panel result-card '+(run?'':'pending')+'"><div class="result-top"><div><h3>'+title+'</h3><p class="result-meta">一阶 TVLA · 案例记录 '+count+' 条曲线</p></div>'+chip('检测结果图','gray')+'</div>'+image(file,title+' TVLA 检测结果图')+'<div class="result-status">'+chip(run?(baseline?'检测现象：明显越阈':'检测现象：一阶未越阈'):'图片预览 · 待加载',run?(baseline?'red':'green'):'gray')+'<span class="muted">阈值 ±4.5</span></div><p class="figure-source">'+(baseline?'基线结果':'防护结果')+' · <a href="#sources">查看来源</a></p><p class="result-caption">'+(baseline?'基线图展示记录条件下的统计差异。':'结论仅适用于记录样本量与一阶检测条件。')+'</p><div class="result-actions">'+button((ui.busy===kind?'<span class="loading-indicator"></span>':icon(run?'refresh':'play'))+(run?'重新加载':baseline?'运行未防护基线':'运行防护版本'),'run-'+kind,run?'':'soft',!!ui.busy)+'</div></article>';
  }
  function compactConditions(){return '<div class="panel mini-section"><h3>'+icon('cpu')+'TVLA 检测条件</h3><dl class="definition-list"><dt>目标板卡</dt><dd>SAKURA-X</dd><dt>测量设备</dt><dd>PicoScope 5244B</dd><dt>采样率</dt><dd>250 MS/s</dd><dt>采集工作频率</dt><dd>3 MHz</dd><dt>检测阶数</dt><dd>一阶 · Welch t 检验</dd></dl><p class="figure-source" style="margin-top:12px">检测环境 · 与资源综合环境分别记录</p></div>';}
  function activity(){return '<div class="panel activity-panel"><div class="panel-head"><h2>本次操作记录</h2><span class="muted" style="font-size:9px">软件操作 · 北京时间</span></div><ul class="activity-list">'+state.events.slice(0,4).map(r=>'<li><span class="event-dot"></span><span>'+e(r.message)+'</span><time datetime="'+r.at+'">'+C.formatDate(r.at)+'</time></li>').join('')+'</ul></div>';}
  function workspace(){
    const v=current();
    return header('AES 侧信道防护对比','在同一案例中，理解泄漏检测、实现成本与随机性需求。',button(icon('upload')+'导入配置','open-import')+button(icon('play')+'运行完整案例','run-all','primary',!!ui.busy))+
    '<div class="case-strip"><div class="case-strip-main">'+icon('folder')+'<strong>'+e(state.config.project_name)+'</strong>'+chip('案例已载入','purple')+'</div><div class="case-strip-meta"><span>AES-128</span><span>已有结果案例</span><button class="help-button" data-action="navigate" data-route="config">配置详情 '+icon('chevron')+'</button></div></div>'+
    '<div class="stats-grid">'+[
      ['target','TVLA 参考阈值','±4.5','|t|','一阶检测 · 固定组 / 随机组'],
      ['activity','未防护基线样本','100,000','条','案例记录 · 曲线数量'],
      ['shield','防护案例样本','10,000,000','条','案例记录 · 曲线数量'],
      ['layers','当前方案资源',String(v.slices),'slices','Spartan-6 · FPGA 资源记录']
    ].map(([i,title,value,unit,foot])=>'<div class="stat-card"><div class="stat-top"><span>'+title+'</span><span class="stat-icon">'+icon(i)+'</span></div><div class="stat-value">'+value+'<span>'+unit+'</span></div><div class="stat-foot">'+foot+'</div></div>').join('')+'</div>'+workflow()+
    '<div class="workspace-grid"><div><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:15px">选择防护方案</h2><span class="muted" style="font-size:10px">02 个既有案例</span></div>'+variantCards()+
    '<div class="conditions-note">'+icon('info')+'<span>* 每周期额外新鲜随机量，低随机数方案仍需随机初始化与警卫更新。</span></div>'+section('泄漏检测结果','保留原始坐标、样本量与结论范围。','<span class="right-note">'+icon('expand')+'点击图像查看原图</span>')+'<div class="results-grid">'+resultCard('baseline')+resultCard('protected')+'</div>'+activity()+'</div><aside class="workspace-aside"><div class="panel summary-card"><div class="summary-heading">CURRENT EVALUATION</div><h2>'+v.name+'</h2><p class="description">'+v.description+'</p><div class="summary-swatch"></div><dl class="resource-compact"><div><dt>逻辑资源</dt><dd>'+v.lut+' <span>LUT</span></dd></div><div><dt>寄存器</dt><dd>'+v.ff+' <span>FF</span></dd></div><div><dt>加密周期</dt><dd>236 <span>cycles</span></dd></div><div><dt>最高综合频率</dt><dd>'+v.max_clock_mhz+' <span>MHz</span></dd></div></dl><p class="footnote">名义吞吐率约 '+C.throughput(v)+' Mbit/s<br>由文献参数估算，不计通信与随机源开销。</p>'+button('查看完整对比 '+icon('arrow'),'compare','soft wide',!!ui.busy)+'</div>'+compactConditions()+'<div class="panel mini-section evidence-note"><strong>每项结论，都保留依据</strong><p>当前展示关联检测结果图、资源表与采集材料，图表来源和文件校验信息统一保存在素材记录中。</p>'+button('浏览案例与来源 '+icon('arrow'),'navigate','quiet small',false,'data-route="sources"')+'</div></aside></div>';
  }
  function tableResources(){return '<div class="table-wrap"><table><thead><tr><th>防护方案</th><th>Slices</th><th>LUT</th><th>FF</th><th>BRAM</th><th>周期</th><th>最高综合频率</th><th>名义吞吐率*</th></tr></thead><tbody>'+Object.values(D.variants).map(v=>'<tr class="'+(v.id===current().id?'active-row':'')+'"><td>'+v.name+(v.id===current().id?' '+chip('当前','purple'):'')+'</td><td>'+v.slices+'</td><td>'+v.lut+'</td><td>'+v.ff+'</td><td>'+v.bram+'</td><td>'+v.cycles+'</td><td>'+v.max_clock_mhz+' MHz</td><td>'+C.throughput(v)+' Mbit/s</td></tr>').join('')+'</tbody></table></div>';}
  function gate(title,description,action,label){return '<div class="panel empty-state"><div class="empty-symbol">'+icon('compare')+'</div><h2>'+e(title)+'</h2><p>'+e(description)+'</p>'+button(icon('play')+label,action,'primary',!!ui.busy)+'</div>';}
  function comparePage(){
    let html=header('结果对比','将检测现象与实现成本放在各自的条件下比较。',button(icon('report')+'前往报告中心','go-reports','primary',!state.compared));
    if(!state.compared)return html+workflow()+gate('当前案例尚未完成对比','先校验并加载当前方案的基线与防护结果，再汇总资源指标和条件差异。','run-all','运行当前完整案例');
    html+='<div class="results-grid">'+resultCard('baseline')+resultCard('protected')+'</div>'+banner('基线记录 100000 条、防护记录 10000000 条曲线；按一阶 Welch t 检验与 ±4.5 参考阈值展示检测现象，保留各图原始坐标和样本规模。');
    html+=section('FPGA 资源与性能','资源记录表 5.4 · Spartan-6 XC6SLX75 · ISE Design Suite 14.7')+'<div class="panel">'+tableResources()+'<div class="comparison-conclusion">'+icon('info')+'<div><h3>相同周期数下，资源与随机性呈现不同取舍</h3><p>* 名义吞吐率 = 128 × 最高综合频率 ÷ 236。低资源约 78.6 Mbit/s，低随机数约 67.8 Mbit/s，属于参数估算。资源综合平台与 TVLA 采集平台分别记录。</p></div></div></div>';
    html+=section('两种防护方案的成本差异','以低随机数方案为分母，比较两种防护方案的资源配置。')+'<div class="three-columns"><div class="panel panel-body"><h3>FPGA 逻辑资源</h3><div class="metric-pair"><div><strong>195</strong><span>低资源 / slices</span></div><div><strong>212</strong><span>低随机数 / slices</span></div></div><div class="progress-track"><div style="width:92%"></div></div><div class="progress-track mint"><div style="width:100%"></div></div><p class="delta-note">低资源方案少用 <b>17 slices · 约 8.0%</b></p></div><div class="panel panel-body"><h3>ASIC 等效面积</h3><div class="metric-pair"><div><strong>6,806</strong><span>低资源 / GE</span></div><div><strong>7,671</strong><span>低随机数 / GE</span></div></div><div class="progress-track"><div style="width:88.7%"></div></div><div class="progress-track mint"><div style="width:100%"></div></div><p class="delta-note">低资源方案少用 <b>865 GE · 约 11.3%</b></p></div><div class="panel panel-body"><h3>额外新鲜随机量</h3><div class="metric-pair"><div><strong>22</strong><span>低资源 / bit 每周期</span></div><div><strong>0*</strong><span>低随机数 / 原表列值</span></div></div><p class="text-content" style="font-size:10px">* 低随机数方案仍需 23 比特可复用随机量及 8 比特 guard 初始化，并按既定机制更新。</p></div></div>';
    html+=section('文献方案性能对照','按作者与具体文献标注，分别比较 FPGA 和 ASIC 实现。')+'<section class="panel panel-body"><h3>FPGA 对照表</h3>'+C.performanceTablesHTML({tableId:'fpga',interactive:true})+'</section><section class="panel panel-body" style="margin-top:20px"><h3>ASIC 对照表</h3>'+C.performanceTablesHTML({tableId:'asic',interactive:true})+'</section><details class="panel panel-body" style="margin-top:20px"><summary>查看原始对照表图像</summary><div class="two-columns" style="margin-top:16px">'+mediaCard('table-fpga.png','FPGA 原始记录','保留原始表格图像及统计标记。')+mediaCard('table-asic.png','ASIC 原始记录','保留工艺与统计范围脚注。')+'</div></details><div class="two-columns" style="margin-top:20px">'+mediaCard(current().growthAsset,'基线统计量随样本量变化','检测图 '+current().growthFigure+' · 10000 至 90000 条曲线的趋势图。')+'<div class="panel panel-body text-content"><h3>项目文档与比较口径</h3><p style="margin-top:14px">项目文档表 3-2 中的既有方案包括 203 slices、476 LUT、529 FF、108kb BRAM、216 周期、138 MHz 和 8 比特额外随机量的记录。</p><p>各方案按对应文献的工艺、PRNG、密钥掩码及随机量统计条件列示，结合逻辑资源、存储和时序指标比较实现取舍。</p><p>ASIC 数据：NanGate 45nm / Design Compiler v2016.03。参考文献与项目文档一致，可在“案例与来源”查看。</p><a href="#sources">查看参考文献 '+icon('book')+'</a></div></div>';
    return html;
  }
  function mediaCard(file,title,description='',photo=false){return '<article class="panel media-card '+(photo?'photo':'')+'"><h3>'+e(title)+'</h3>'+image(file,title)+'<p>'+e(description||assetCaption(file))+'</p></article>';}
  function theoryPage(){
    const v=current();
    const theories=[
      ['S盒逻辑函数整合','从 Cagdas Calik S盒的 113 个单独逻辑函数出发，整合为 16 个复合函数，再组织为三模块。合并时控制代数次数，兼顾防护构造、寄存器和随机量成本。','sbox-integrated.png'],
      ['ANF 表达式优化','在 GF(2) 上展开、归并、消去重复项，保持布尔函数等价。x ⊕ x = 0，xx = x；代数等价仍需与分量依赖和安全边界共同检查。','eq-5-2.png'],
      ['组合乘积项拆分与逻辑门复用','根据乘积项间的变量关系检查非完备性。必要时将复合函数拆分，并在既定分量和寄存器边界内复用公共运算。','cmt-tree.png'],
      ['三模块逻辑表达式','前两层形成中间变量，第三层输出 s0 至 s7。计算层与线性压缩层之间设置寄存器；正确性、非完备性和均匀性共同约束构造。','eq-5-4.png'],
      ['低资源门限防护构造','通过函数整合、ANF 化简和公共逻辑复用降低门限防护成本。原文每周期需要 22 比特新鲜额外随机量，AES 加密为 236 周期。','sbox-low-area.png'],
      ['低随机数复用与警卫换岗','Changing-of-the-Guards 依赖 23 比特复用随机量、8 比特 guard 初始化及更新规则。它减轻持续新鲜随机性需求，同时带来逻辑和寄存器成本。','sbox-low-random.png']
    ];
    return header('理论与硬件结构','从布尔函数优化到门限防护，理解当前方案的结构与构造。',chip('方案结构','purple'))+
    '<div class="two-columns">'+mediaCard(v.sboxAsset,'当前方案 · '+v.name+' S盒','当前方案 S盒结构 · '+v.shortName)+mediaCard(v.aesAsset,'当前方案 · 8 比特串行 AES 数据通路','10 × (20 + 2) + 16 = 236 个周期；状态运算与密钥扩展共享掩码 S盒。')+'</div>'+section('关键理论与构造','依次展开说明，查看结构图和公式。')+'<div class="panel accordion">'+theories.map(([title,text,file],i)=>'<details '+(i===0?'open':'')+'><summary><span class="index">0'+(i+1)+'</span>'+e(title)+'</summary><div class="accordion-content text-content"><p>'+e(text)+'</p>'+image(file,title)+'<p class="figure-source">'+e(assetCaption(file))+'</p></div></details>').join('')+'</div>'+banner('门限构造围绕正确性、非完备性与均匀性组织分量计算，结构图、逻辑表达式和随机量条件相互对应。');
  }
  function hardwarePage(){
    let html=header('硬件与采集资料','集中展示实验设备、采集参数、现场波形和板卡操作资料。',chip('实验设备与采集记录','purple'))+
    '<div class="tab-bar" role="group" aria-label="硬件资料分类">'+['现场与采集','SASEBO-GIII','SASEBO-GII'].map(t=>'<button class="tab-button '+(ui.hardwareTab===t?'active':'')+'" data-action="hardware-tab" data-tab="'+t+'" aria-pressed="'+(ui.hardwareTab===t)+'">'+t+'</button>').join('')+'</div>';
    if(ui.hardwareTab==='现场与采集'){
      html+='<div class="two-columns">'+mediaCard('hardware-photo.jpg','实验设备与连接','SAKURA-X、Xilinx 下载线与 PicoScope 5000 Series 设备连接画面。',true)+mediaCard('acquisition.png','采集界面与完成计数','显示 250M、20000 点、10000000 条完成计数、100% 进度，耗时 19h29m58s。')+'</div>';
      html+=section('采集参数','采集界面中的采样设置与完成记录。')+'<div class="stats-grid">'+[['采样率','250','MS/s'],['单条采样点','20,000','点'],['完成计数','10,000,000','条'],['估算采集窗口','80','μs']].map(([title,value,unit])=>'<div class="stat-card"><div class="stat-top">'+title+'</div><div class="stat-value">'+value+'<span>'+unit+'</span></div><div class="stat-foot">'+(unit==='μs'?'20000 ÷ 250 MS/s':'采集界面参数记录')+'</div></div>').join('')+'</div>';
      html+=section('现场波形画面','展示本组实验现场的波形记录。')+'<div class="panel panel-body"><div class="photo-grid">'+[1,2,3,4].map(n=>'<div>'+image('wave-photo-'+n+'.png','现场波形画面 '+n)+'<p>本组实验输出后现场波形 '+n+'</p></div>').join('')+'</div></div>'+banner('实验材料按设备连接、采集界面和现场波形组织，采样参数与完成计数随画面列示。');
      html+='<div class="two-columns">'+compactConditions()+'<div class="panel panel-body text-content"><h3>资源与时序的统计环境</h3><p style="margin-top:13px">FPGA：Spartan-6 XC6SLX75，ISE Design Suite 14.7，资源记录表 5.4。</p><p>ASIC：NanGate 45nm，Design Compiler v2016.03，资源记录表 5.3。</p><p>资源表采用综合频率口径，采集流程采用 3 MHz 工作频率，两类参数按用途列示。</p></div></div>';
    }else if(ui.hardwareTab==='SASEBO-GIII'){
      html+=banner('以下为 SASEBO-GIII 手册示例。其接口编号、拨码与触发设置对应该板卡版本；现场照片中的 SAKURA-X 另行识别。');
      html+='<div class="two-columns">'+mediaCard('giii-functions-original.png','板卡功能与接口分区','SASEBO-GIII Specification v1.1 · PDF 第 6 页。')+mediaCard('giii-setup-original.png','拨码与上电配置位置','Quick Start Guide · PDF 第 4 页。示例 SW3 第 2 位 ON；CN10 / CN5 对应两路配置通道。')+'</div><div class="two-columns" style="margin-top:20px">'+mediaCard('giii-measurement-original.png','功耗与触发测量示例','Quick Start Guide · PDF 第 6 页。')+'<div class="panel panel-body text-content"><h3>GIII 连接示例</h3><p style="margin-top:14px">通道 1：50Ω SMA-BNC 连接 J19，获取功耗信号。</p><p>通道 2：CN8 第 1 引脚作为触发，探头地线接 TP30，负边沿触发。</p><p>接口编号、拨码和触发设置按 SASEBO-GIII 手册组织，连接示例与对应板卡版本配套展示。</p></div></div>';
    }else{
      html+=banner('以下为 SASEBO-GII 采集流程。CH1 / CH2、触发沿和接地位置均按该流程记录，不与 GIII 接线合并。');
      html+='<div class="two-columns">'+mediaCard('gii-04.png','程序配置文件生成','Windows 10 / ISE 14.7。iMPACT 将 .bit 转为 MCS，Generate File 后生成配置文件。')+mediaCard('gii-08.png','示波器连接照片','CH1 接 J2；CH2 接 J6 第 1 引脚；地接 TP3，上升沿触发。',true)+'</div><div class="panel panel-body text-content" style="margin-top:20px"><h3>采集过程记录</h3><p style="margin-top:12px">经 CN4 下载接口初始化器件链并配置 Flash；在采集程序中选择 Design、Trace Number、SavePath、FileType 与 Scope 参数。</p><p>Single 用于单条波形观察，检查触发稳定、幅度未截断和采样窗口；Start 用于批量采集。本系统展示流程资料，不控制板卡或示波器。</p></div>';
    }
    return html;
  }
  function assetGrid(){
    const query=ui.search.trim().toLowerCase();
    const entries=Object.entries(M).filter(([file,m])=>(ui.filter==='all'||m.category===ui.filter)&&(!query||(file+' '+assetTitle(file)+' '+assetSource(file)+' '+(m.original_item||'')).toLowerCase().includes(query)));
    return entries.length?entries.map(([file,m])=>'<article class="panel asset-card">'+image(file)+'<h3>'+e(assetTitle(file))+'</h3><p>'+e(assetCaption(file))+'</p><details class="asset-provenance"><summary>查看素材记录</summary><p>'+e(assetSource(file))+'</p></details><p class="hash" title="完整 SHA-256">SHA-256 '+e(m.sha256)+'</p></article>').join(''):'<p class="muted" style="padding:20px">没有匹配的素材，尝试其他关键词或分类。</p>';
  }
  function sourcesPage(){return header('案例与来源','从原图、图表编号和文件校验值，追溯每项材料。',button(icon('download')+'导出来源清单','download-manifest'))+
    '<section class="panel bibliography-panel"><h2>参考文献</h2><p class="reference-intro">沿用项目文档的 16 条参考文献编号与顺序；性能对比文献以 C 编号单独列示，支持从对照表直接查阅。</p>'+C.referencesHTML()+'</section><div class="source-list"><article class="panel source-card">'+chip('本作品实现','purple')+'<h3>AES 侧信道防护对比与报告系统</h3><p>配置导入 · 结果对比 · 报告导出</p><p>统一关联项目配置、防护方案、检测图像与资源指标，支持图片完整性校验、方案切换和离线图文报告。</p></article>'+D.sources.map(s=>'<article class="panel source-card">'+chip(s.type,'gray')+'<h3>'+e(s.title)+'</h3><p>'+e(s.author)+(s.year?' · '+s.year:'')+'</p><p>'+e(s.note)+'</p>'+(s.url?'<a href="'+e(s.url)+'" target="_blank" rel="noopener noreferrer">查看公开来源 '+icon('link')+'</a>':'')+'</article>').join('')+'</div>'+banner(projectDocumentTitle)+
    '<div class="source-toolbar"><div class="search-box">'+icon('search')+'<input id="asset-search" type="search" placeholder="搜索图片名称、图号或来源…" value="'+e(ui.search)+'" aria-label="搜索素材"></div><span class="muted" style="font-size:10px">'+Object.keys(M).length+' 项素材 · 原图已随系统内嵌</span></div><div class="tab-bar" role="group" aria-label="素材分类">'+[['all','全部'],['tvla','TVLA'],['structure','结构'],['hardware','硬件'],['formula','公式'],['table','原表']].map(([id,label])=>'<button class="tab-button '+(ui.filter===id?'active':'')+'" data-action="asset-filter" data-filter="'+id+'" aria-pressed="'+(ui.filter===id)+'">'+label+'</button>').join('')+'</div><div class="asset-grid" id="asset-grid">'+assetGrid()+'</div>';}
  function configPage(){return header('项目配置','用一份配置关联项目、方案、测试条件与对应结果图。',button(icon('download')+'下载当前配置','download-config'))+
    '<div class="two-columns"><div class="stack"><section class="panel"><div class="panel-head"><h2>当前案例设置</h2>'+chip('配置 v'+state.config.schema_version,'purple')+'</div><form id="case-form" class="panel-body config-form"><label for="project-name">项目名称</label><input id="project-name" name="name" value="'+e(state.config.project_name)+'" maxlength="100" required><label for="project-id">项目标识</label><input id="project-id" name="id" value="'+e(state.config.project_id)+'" maxlength="80" required><label for="protection-select">防护方案</label><select id="protection-select" name="protection">'+Object.values(D.variants).map(v=>'<option value="'+v.id+'" '+(v.id===current().id?'selected':'')+'>'+v.name+'</option>').join('')+'</select><p class="hint">变更项目或方案后，重新加载结果并生成对比，确保图片和报告对应当前配置。</p><button type="submit" class="button primary" '+(ui.busy?'disabled':'')+'>'+icon('check')+'应用设置</button></form></section><section class="panel panel-body text-content"><h3>可导入的配置</h3><p style="margin-top:12px">支持版本 1.0 与 1.1 的 existing_results 案例。兼容已有低资源配置，自动关联结构、图片及资源字段。</p><p>当前提供两种已核对的文献案例，检测阈值、图号、样本量和资源指标需与原始来源匹配。</p>'+button('下载低资源示例','download-example','small',false,'data-id="low-resource-ti"')+' '+button('下载低随机数示例','download-example','small',false,'data-id="low-randomness-ti"')+'</section></div><section class="panel"><div class="panel-head"><h2>导入项目配置</h2><span class="muted" style="font-size:10px">JSON · 最大 2 MB</span></div><div class="panel-body"><div class="dropzone" data-action="open-import" id="config-dropzone" role="button" tabindex="0" aria-label="选择或拖入 JSON 配置文件">'+icon('upload')+'<strong>点击选择，或将配置文件拖到这里</strong><p>文件仅在当前浏览器中读取</p></div>'+(ui.errors.length?'<div class="errors" role="alert"><h3>配置未能导入</h3><ul>'+ui.errors.map(err=>'<li>'+e(err)+'</li>').join('')+'</ul></div>':'')+'<label for="config-editor" style="display:block;font-size:11px;color:#a18ab1;margin-top:20px">也可以粘贴完整配置</label><textarea class="config-editor" id="config-editor" spellcheck="false" aria-label="JSON 配置内容">'+e(JSON.stringify(state.config,null,2))+'</textarea>'+button(icon('check')+'校验并导入文本','import-text','soft',!!ui.busy)+' '+button('恢复内置案例','reset-example','small',!!ui.busy)+'</div></section></div>'+banner('配置校验在导入时一次完成。缺字段、图号与方案不匹配、修改文献指标、未知版本或无效 JSON 会给出具体提示，当前有效项目保留。');}
  function reportsPage(){
    let html=header('报告中心','从当前案例直接生成可独立打开的图文报告。',chip(current().shortName,'purple'));
    if(!state.compared)return html+gate('完成结果对比后，即可导出报告','报告需要当前方案的基线、防护图像、测试条件和资源参数。先完成案例加载与对比。','run-all','运行案例并生成对比');
    const v=current();
    return html+'<div class="panel"><div class="report-actions">'+button(icon('download')+'导出完整 HTML 报告','export-html','primary')+button(icon('report')+'打印 / 另存为 PDF','print-report')+button(icon('code')+'导出记录 JSON','export-json')+'<span class="muted">图像已内嵌 · 无需联网 · 可独立阅读</span></div><div class="report-preview"><article class="report-sheet"><div class="eyebrow">CASE EVALUATION REPORT</div><h2>'+projectDocumentTitle+'</h2><p>'+e(state.config.project_name)+' · '+v.name+'</p><p>基于已有文献结果的案例整理 · 当前对比完成于 '+e(C.formatDate(state.comparedAt))+'</p><div class="report-rule"></div><h3>01 案例与检测条件</h3><p>SAKURA-X / Kintex-7，PicoScope 5244B，250 MS/s，3 MHz，一阶 Welch t 检验，参考阈值 ±4.5，采用固定明文与随机明文分组。</p><h3>02 未防护基线与防护结果</h3><p>未防护：100000 条曲线，检测图显示明显越阈。'+v.name+'：10000000 条曲线，所记录条件下未观察到显著的一阶越阈。</p><img src="'+A[v.baselineAsset]+'" alt="报告预览：未防护 TVLA 原图"><p>未防护 · '+e(assetSource(v.baselineAsset))+'</p><img src="'+A[v.protectedAsset]+'" alt="报告预览：防护 TVLA 原图"><p>'+v.name+' · '+e(assetSource(v.protectedAsset))+'</p><h3>03 资源与性能取舍</h3>'+tableResources()+'<p style="margin-top:11px">名义吞吐率按频率与周期计算。以下性能对照表与最新项目文档的表 3-1、表 3-2 一致，完整报告同时保留结构图、随机量条件和软件执行记录。</p>'+C.performanceTablesHTML({interactive:true})+'<h3>04 方案实现与分析方法</h3><p>系统以配置、图像和来源关联组织检测结果，并从资源、周期与随机量需求比较方案取舍。图表保留对应平台、样本量与一阶检测条件，软件执行记录随项目文档输出。</p><h3>05 参考文献</h3><p>保留项目文档的 16 条参考文献，性能对比文献采用独立 C 编号。</p>'+C.referencesHTML()+'</article></div></div>'+banner('HTML 报告包含全部必要图片，不依赖本系统目录。记录 JSON 保存当前配置、加载记录、比较条件与素材校验信息，可用于后续交接。');
  }
  function render(){
    const renderers={workspace,config:configPage,compare:comparePage,theory:theoryPage,hardware:hardwarePage,sources:sourcesPage,reports:reportsPage};
    const engineering=window.AESEngineeringUI;
    const content=engineering?.active(ui.route)?engineering.render(ui.route):renderers[ui.route]();
    $('#app').innerHTML=shell((engineering?.modeBar(ui.route)||'')+content);
    document.title=routeNames[ui.route]+' · AES 侧信道防护对比与报告系统';
  }
  function applyConfig(config,message){state={...C.newState(config),revision:state.revision+1,events:state.events};ui.errors=[];log(message,'config');persist();render();toast(message);}
  function importConfig(text){
    const result=C.validateConfig(text);
    if(!result.ok){ui.errors=result.errors;navigate('config');toast('配置校验未通过，已保留当前有效项目。',true);return false;}
    applyConfig(result.config,result.migrated?'旧版配置已导入并补齐为 1.1，待重新加载结果。':'配置校验通过，当前案例已更新。');return true;
  }
  async function importFile(file){if(!file)return;if(file.size>2*1024*1024){ui.errors=['配置文件超过 2 MB，请使用仅包含元数据的 JSON。'];navigate('config');toast('文件过大，未导入。',true);return;}try{importConfig(await file.text());}catch{toast('无法读取该文件，请选择有效的 JSON 配置。',true);}}
  const assetLoads=new Map();
  async function ensureEmbeddedAsset(file){
    if(!A[file])throw new Error('缺少图片：'+file);
    if(A[file].startsWith('data:image/'))return A[file];
    if(!assetLoads.has(file)){
      const task=(async()=>{
        const response=await fetch(A[file]);
        if(!response.ok)throw new Error('图片加载失败：'+file+'（HTTP '+response.status+'）');
        const blob=await response.blob();
        const dataURL=await new Promise((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('图片读取失败：'+file));reader.readAsDataURL(blob);
        });
        if(!dataURL.startsWith('data:image/'))throw new Error('图片格式不正确：'+file);
        A[file]=dataURL;return dataURL;
      })();
      assetLoads.set(file,task);
      task.catch(()=>assetLoads.delete(file));
    }
    return assetLoads.get(file);
  }
  async function verifyAsset(file){
    await ensureEmbeddedAsset(file);
    if(!A[file]||!M[file])throw new Error('缺少对应素材或来源记录：'+file);
    const image=new Image();image.src=A[file];await image.decode();
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('图片无法解码：'+file);
    let hashChecked=false;
    if(window.crypto?.subtle){
      const raw=atob(A[file].split(',')[1]),bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
      if(actual!==M[file].sha256)throw new Error('图片 SHA-256 与来源表不一致：'+file);
      hashChecked=true;
    }
    return {file,width:image.naturalWidth,height:image.naturalHeight,sha256:M[file].sha256,hash_checked:hashChecked};
  }
  async function run(kind,silent=false){
    if(ui.busy)return false;
    const valid=C.validateConfig(state.config);if(!valid.ok){toast(valid.errors[0],true);return false;}
    const revision=state.revision,v=current(),start=performance.now();ui.busy=kind;render();
    try{
      const files=kind==='baseline'?[v.baselineAsset]:[v.protectedAsset,v.sboxAsset,v.aesAsset,'table-fpga.png','table-asic.png','hardware-photo.jpg','acquisition.png'];
      const checks=await Promise.all(files.map(verifyAsset));
      if(revision!==state.revision)return false;
      const hashChecked=checks.every(c=>c.hash_checked);
      state.runs[kind]={selection:v.id,revision,completed_at:new Date().toISOString(),result_kind:'literature_figure',operation:'validate_and_load_existing_results',assets:checks,verification:hashChecked?'配置、图像解码与 SHA-256 校验通过':'配置与图像解码通过；本浏览器未提供 SHA-256 校验接口',software_load_ms:Math.round(performance.now()-start)};
      state.compared=false;state.comparedAt=null;state.exportedAt=null;
      log((kind==='baseline'?'未防护基线':v.name)+'已加载；'+(hashChecked?'原图校验通过。':'图像解码通过。'),'load');
      if(!silent)toast('已有结果加载完成，可继续比较；原始波形未重新计算。');
      return true;
    }catch(err){if(revision===state.revision){state.runs[kind]=null;state.compared=false;state.comparedAt=null;state.exportedAt=null;}toast(err.message||'结果加载失败。',true);log('案例加载失败：'+(err.message||'未知错误'),'error');return false;}
    finally{ui.busy=null;render();}
  }
  function compare(navigateAfter=true){
    if(!state.runs.baseline||!state.runs.protected){if(navigateAfter)navigate('compare');toast('请先分别加载基线和防护结果。');return false;}
    if(['baseline','protected'].some(k=>state.runs[k].selection!==current().id||state.runs[k].revision!==state.revision)){toast('方案已变化，请重新加载当前案例。',true);return false;}
    state.compared=true;state.comparedAt=new Date().toISOString();state.exportedAt=null;log('当前案例对比已生成；保留样本、平台与随机性条件。','compare');
    if(navigateAfter)navigate('compare');else render();
    return true;
  }
  async function runAll(){if(ui.busy)return;const revision=state.revision;if(!await run('baseline',true)||revision!==state.revision)return;if(!await run('protected',true)||revision!==state.revision)return;if(compare()){toast('当前案例已完成加载与对比，可以导出报告。');}}
  function saveBlob(blob,filename){
    const url=URL.createObjectURL(blob);objectURLs.add(url);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>{URL.revokeObjectURL(url);objectURLs.delete(url);},30000);
  }
  function saveJSON(data,filename){saveBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),filename);}
  function reportFilename(extension){return projectDocumentTitle+'_'+current().shortName+'_'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())+'.'+extension;}
  function exportReport(kind){
    try{
      if(kind==='json'){saveJSON(C.reportData(state,M),reportFilename('json'));log('已导出当前案例的结构化记录 JSON。','export');}
      else {
        const html=C.buildReport(state,A,M);
        if(kind==='print'){
          const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));objectURLs.add(url);
          const opened=window.open(url,'_blank');
          if(!opened){URL.revokeObjectURL(url);objectURLs.delete(url);toast('浏览器阻止了报告窗口。请导出 HTML，打开后点击打印。',true);return;}
          log('已打开独立报告，可通过报告内按钮打印或另存 PDF。','export');
        } else {saveBlob(new Blob([html],{type:'text/html;charset=utf-8'}),reportFilename('html'));log('已导出当前方案的独立 HTML 图文报告。','export');}
      }
      state.exportedAt=new Date().toISOString();render();toast(kind==='print'?'独立报告已打开，点击报告顶部的“打印 / 另存为 PDF”。':'报告已按当前选择生成并导出。');
    }catch(err){toast(err.message,true);}
  }
  function showImage(file){if(!A[file])return;ui.viewerFile=file;ui.zoom=1;$('#viewer-title').textContent=assetTitle(file);$('#viewer-source').textContent=assetCaption(file);$('#viewer-image').src=A[file];$('#viewer-image').alt=assetTitle(file);updateZoom();$('#image-viewer').showModal();}
  function updateZoom(){const img=$('#viewer-image');img.style.width=(ui.zoom*100)+'%';$('#zoom-value').value=Math.round(ui.zoom*100)+'%';}
  document.addEventListener('click',async event=>{
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;
    const action=node.dataset.action;
    if(action==='view-reference'){event.preventDefault();navigate('sources');document.getElementById(node.dataset.referenceId)?.scrollIntoView({block:'center',behavior:'smooth'});}
    else if(action==='navigate')navigate(node.dataset.route);
    else if(action==='open-import')$('#config-file').click();
    else if(action==='run-baseline')await run('baseline');
    else if(action==='run-protected')await run('protected');
    else if(action==='run-all')await runAll();
    else if(action==='compare')compare();
    else if(action==='go-reports')navigate('reports');
    else if(action==='select-variant'){
      if(current().id===node.dataset.id||ui.busy)return;
      state=C.selectVariant(state,node.dataset.id);log('已切换至'+current().name+'；旧结果和对比已清除。','config');persist();render();toast('方案已切换，图片与指标已同步，待重新加载结果。');
    }else if(action==='download-config'){saveJSON(state.config,'AES项目配置_'+current().shortName+'.json');toast('已导出当前项目配置。');}
    else if(action==='download-example'){saveJSON(C.createConfig(node.dataset.id),'示例配置_'+D.variants[node.dataset.id].shortName+'.json');toast('示例配置已导出。');}
    else if(action==='download-manifest'){saveJSON({project_document:D.projectDocument,sources:D.sources,references:D.references,comparison_references:D.comparisonReferences,assets:M,source_documents:{latest_document:D.referenceDocument}},'AES案例素材来源清单.json');toast('来源清单已导出。');}
    else if(action==='reset-example')applyConfig(C.createConfig(),'已恢复内置低资源案例，待重新加载结果。');
    else if(action==='import-text'){const text=$('#config-editor').value;importConfig(text);if(ui.errors.length){const editor=$('#config-editor');if(editor)editor.value=text;}}
    else if(action==='hardware-tab'){ui.hardwareTab=node.dataset.tab;render();}
    else if(action==='asset-filter'){ui.filter=node.dataset.filter;render();}
    else if(action==='view-image')showImage(node.dataset.file);
    else if(action==='close-viewer')$('#image-viewer').close();
    else if(action==='viewer-source'){ui.search=ui.viewerFile||'';ui.filter='all';$('#image-viewer').close();navigate('sources');}
    else if(action==='zoom-in'){ui.zoom=Math.min(3,ui.zoom+.25);updateZoom();}
    else if(action==='zoom-out'){ui.zoom=Math.max(.25,ui.zoom-.25);updateZoom();}
    else if(action==='download-image'){
      const anchor=document.createElement('a');anchor.href=A[ui.viewerFile];anchor.download=ui.viewerFile;document.body.append(anchor);anchor.click();anchor.remove();
    }else if(action==='export-html')exportReport('html');
    else if(action==='export-json')exportReport('json');
    else if(action==='print-report')exportReport('print');
    else if(action==='toggle-menu')$('#sidebar').classList.toggle('open');
    else if(action==='close-menu')$('#sidebar').classList.remove('open');
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='case-form')return;event.preventDefault();if(ui.busy)return;
    const form=new FormData(event.target);const name=String(form.get('name')).trim(),id=String(form.get('id')).trim();
    if(!name||!id){toast('项目名称和标识不能为空。',true);return;}
    applyConfig(C.createConfig(String(form.get('protection')),name,id),'项目设置已更新，旧结果与比较已清除。');
  });
  document.addEventListener('input',event=>{if(event.target.id==='asset-search'){ui.search=event.target.value;$('#asset-grid').innerHTML=assetGrid();}});
  $('#config-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';await importFile(file);});
  document.addEventListener('dragover',event=>{const zone=event.target.closest('#config-dropzone');if(zone){event.preventDefault();zone.classList.add('dragover');}});
  document.addEventListener('dragleave',event=>{const zone=event.target.closest('#config-dropzone');if(zone&&!zone.contains(event.relatedTarget))zone.classList.remove('dragover');});
  document.addEventListener('drop',event=>{const zone=event.target.closest('#config-dropzone');if(zone){event.preventDefault();zone.classList.remove('dragover');importFile(event.dataTransfer.files[0]);}});
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.id==='config-dropzone'){event.preventDefault();$('#config-file').click();}});
  window.addEventListener('hashchange',()=>{const route=location.hash.slice(1);if(routeNames[route]&&ui.route!==route){ui.route=route;render();window.scrollTo(0,0);}});
  window.addEventListener('beforeunload',()=>objectURLs.forEach(url=>URL.revokeObjectURL(url)));
  $('#image-viewer').addEventListener('click',event=>{if(event.target===$('#image-viewer'))$('#image-viewer').close();});
  window.AESEngineeringUI?.init({render,navigate,toast,saveBlob,core:C});
  render();
})();
