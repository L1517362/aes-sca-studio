/* Engineering workspace; event handling and state are separate from case config. */
(function(root){
  'use strict';
  const E=root.AESEngineering,I=root.AESIseParser,P=root.AESProleadParser,S=root.AESSelection,D=root.AESData,e=E.escapeHTML;
  const state={mode:'case',kind:'ise',variant_id:'low-resource-ti',records:[],ise_groups:[],pairings:[],selection:null,errors:[],busy:false,generation:0,source_note:'',encoding:'utf-8'};
  let host,samplePromise;
  state.selectionInput={source:'parsed',platform:'fpga',device:'xc6slx75-csg484-2',stage:'PAR',slices:'200',lut:'',ff:'',max_cycles:'',max_period_ns:'',min_throughput_mbps:'',timing_policy:'signed',fresh_supply:'',reusable_bits:'',guard_bits:'',initialization:'unknown',guard_update:'unknown'};
  state.lastSelection=null;state.selectionErrors=[];
  const routes=new Set(['workspace','compare','reports','sources']);
  const btn=(text,action,style='',attrs='')=>'<button class="button '+style+'" data-eng-action="'+action+'" '+attrs+'>'+text+'</button>';
  function modeBar(route){return routes.has(route)?'<div class="eng-mode-bar" role="group" aria-label="工作模式">'+btn('案例对比','case',state.mode==='case'?'primary':'')+btn('工程报告复核','engineering',state.mode==='engineering'?'primary':'')+'</div>':'';}
  function active(route){return state.mode==='engineering'&&routes.has(route);}
  function refresh(){host.render();}
  function cancel(clear=false){state.generation++;state.busy=false;state.errors=[];state.selection=null;state.lastSelection=null;if(clear){state.records=[];state.ise_groups=[];state.pairings=[];}refresh();}
  async function hash(bytes){if(!root.crypto?.subtle)return null;return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
  function inferredVariant(path){if(/(?:^|[/\\])Without_Random(?:[/\\]|$)/i.test(path))return 'low-randomness-ti';if(/(?:^|[/\\])With_Random(?:[/\\]|$)/i.test(path))return 'low-resource-ti';return null;}
  async function importEntries(entries){
    const confirmed=!!document.getElementById('eng-confirm-bundle')?.checked;
    const importKind=state.kind;
    const generation=++state.generation;state.busy=true;state.errors=[];state.selection=null;state.lastSelection=null;refresh();
    const parsed=[],errors=[];let total=0;
    for(let n=0;n<entries.length;n++){
      if(generation!==state.generation)return;
      const item=entries[n];
      try{
        const bytes=item.bytesBuffer||await item.file.arrayBuffer();total+=bytes.byteLength;
        if(bytes.byteLength>5*1024*1024||total>20*1024*1024)throw new Error('单文件上限5 MiB，每批合计上限20 MiB。');
        const path=item.relative_path||item.file?.webkitRelativePath||'';
        const variant=item.variant_id||(state.variant_id==='all'?inferredVariant(path):state.variant_id);
        if(!variant)throw new Error('请明确选择所属方案，或选择包含With_Random/Without_Random的工程目录。');
        const sha=await hash(bytes);if(item.sha256&&sha&&sha!==item.sha256)throw new Error('样例内容SHA-256不匹配。');
        const text=new TextDecoder(state.encoding,{fatal:true}).decode(bytes);
        const meta={file_id:'input-'+generation+'-'+n,name:item.name||item.file.name,bytes:bytes.byteLength,sha256:sha,
          relative_path:path||null,source_note:state.source_note,variant_id:variant,
          bundle_id:item.bundle_id||(path.includes('/')?path.slice(0,path.lastIndexOf('/')):'manual-'+generation),
          association_confirmed:!!item.association_confirmed||confirmed};
        const record=importKind==='ise'?I.parseIseReport(text,meta):parseProleadInput(text,meta);
        if(['error','unsupported'].includes(record.status))errors.push(meta.name+'：'+record.errors.join('；'));
        else parsed.push(record);
      }catch(error){errors.push((item.name||item.file?.name||'输入')+'：'+error.message);}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(generation!==state.generation)return;
    if(!entries.length)errors.push('没有选择可识别的报告文件。');
    if(!errors.length&&parsed.length){state.records=[...state.records.filter(r=>importKind==='ise'?!r.evidence_kind.startsWith('historical_ise'):!r.evidence_kind.startsWith('historical_prolead')), ...parsed];state.ise_groups=I.groupIseReports(state.records,D.variants);state.pairings=P.pairRecords(state.records);}
    state.errors=errors;state.busy=false;refresh();
    const toolErrors=parsed.some(r=>E.operationalErrors(r).length);
    host.toast(errors.length?'本批导入未完成，已保留上一份有效复核。':toolErrors?'已读取报告，工具输出包含ERROR，请查看报告错误详情。':'工程报告已解析，可查看依据并导出。',!!errors.length||toolErrors);
  }
  async function samples(){
    if(root.AESEngineeringSamples)return root.AESEngineeringSamples;
    if(!samplePromise)samplePromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='engineering-samples.js';
      script.onload=()=>resolve(root.AESEngineeringSamples);script.onerror=()=>{samplePromise=null;script.remove();reject(new Error('工程样例未能加载，请重试或选择本地报告。'));};document.head.append(script);
    });return samplePromise;
  }
  async function importSamples(){
    const generation=state.generation;
    try{const data=await samples();if(generation!==state.generation)return;
      const entries=data.entries.filter(x=>state.kind==='ise'?x.kind==='ise':x.kind.startsWith('prolead_')).map(x=>({...x,association_confirmed:true,bytesBuffer:new TextEncoder().encode(x.text).buffer}));
      await importEntries(entries);
    }catch(error){host.toast(error.message,true);}
  }
  function reportState(){return {...state,selection:state.selection};}
  function exportReport(kind){try{const data=host.core.engineeringReportData(reportState());const extension=kind==='json'?'json':'html';const content=kind==='json'?JSON.stringify(data,null,2):host.core.buildEngineeringReport(reportState());host.saveBlob(new Blob([content],{type:kind==='json'?'application/json;charset=utf-8':'text/html;charset=utf-8'}),'AES侧信道防护对比与报告系统项目文档_工程复核_'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())+'.'+extension);host.toast('已导出独立工程复核报告。');}catch(error){host.toast(error.message,true);}}
  function summary(){
    return '<div class="eng-summary"><span><b>'+state.records.length+'</b> 份有效输入</span><span><b>'+state.ise_groups.length+'</b> 个ISE工程分组</span><span><b>'+state.records.filter(r=>r.file.sha256).length+'</b> 份SHA-256校验</span></div>';
  }
  function parseProleadInput(text,meta){
    if(/Start Hardware Leakage Evaluation|Evaluate security under/i.test(text))return P.parseProleadLog(text,meta);
    if(/^\s*(?:max_no_of_threads|no_of_simulations)\b/m.test(text))return P.parseProleadConfig(text,meta);
    if(/\bPROLEAD\b/.test(text))return P.parseProleadCommand(text,meta);
    const r=E.record(text,meta,'historical_prolead_unknown','prolead-input');r.status='unsupported';r.errors.push('未识别PROLEAD日志、config.set或命令文本。');return r;
  }
  function proleadInputPanel(){return iseInputPanel().replace('导入ISE资源与时序报告','导入PROLEAD日志与候选配置').replace('选择 .syr、.mrp、.par、.twr。','选择结果日志、config.set及run.sh。命令文件仅按文本读取。').replace('加载两方案ISE示例','加载PROLEAD示例').replace('accept=".syr,.mrp,.par,.twr,.txt"','accept=".txt,.log,.set,.sh"');}
  function inputPanel(){return state.kind==='ise'?iseInputPanel():proleadInputPanel();}
  function selectionPanel(){
    const v=state.selectionInput;
    const select=(key,label,choices)=>'<label>'+label+'<select data-selection-field="'+key+'" id="select-'+key+'">'+choices.map(([val,text])=>'<option value="'+val+'" '+(v[key]===val?'selected':'')+'>'+text+'</option>').join('')+'</select></label>';
    const num=(key,label)=>'<label>'+label+'<input data-selection-field="'+key+'" id="select-'+key+'" type="text" inputmode="decimal" value="'+e(v[key])+'" placeholder="留空表示不约束"></label>';
    return '<section class="panel panel-body"><h2>按工程条件筛选</h2><p>选择数据来源、目标器件及工程阶段，按资源预算、时序口径和随机量供给条件筛选。</p><div class="eng-fields">'+select('source','数据来源',[['parsed','本次解析的历史ISE'],['baseline','当前正文FPGA性能表']])+select('platform','目标平台',[['fpga','FPGA'],['asic','ASIC']])+'<label>目标器件（完整标识）<input id="select-device" data-selection-field="device" value="'+e(v.device)+'"></label>'+select('stage','来源阶段',[['PAR','PAR布局布线'],['MAP','MAP映射'],['XST','XST综合'],['documented_fpga','正文FPGA性能表']])+num('slices','Slices上限')+num('lut','LUT上限')+num('ff','FF上限')+num('max_cycles','周期数上限（cycles）')+num('max_period_ns','时钟周期上限（ns）')+num('min_throughput_mbps','吞吐下限（Mbit/s）')+select('timing_policy','速度判定口径',[['signed','要求经过约束确认的时序'],['reference','仅按来源参考值估算']])+num('fresh_supply','持续新鲜随机量供给（bits/cycle）')+num('reusable_bits','可用复用随机量（bits）')+num('guard_bits','可用Guard初始化（bits）')+select('initialization','原设计初始化条件',[['unknown','未确认'],['available','可以满足'],['unavailable','不能满足']])+select('guard_update','原设计Guard更新',[['unknown','未确认'],['available','可以满足'],['unavailable','不能满足']])+'</div><p id="selection-draft-status">修改来源、输入或工程记录后，需重新筛选。</p>'+btn('执行条件筛选','select','primary',state.busy?'disabled':'')+(state.selectionErrors.length?'<div class="errors" role="alert">'+state.selectionErrors.map(x=>'<p>'+e(x)+'</p>').join('')+'</div>':'')+'</section>'+E.selectionHTML(state.selection)+(state.lastSelection&&!state.selection?'<details class="eng-last-selection"><summary>查看上一份有效筛选（当前输入尚未通过；不写入新报告）</summary>'+E.selectionHTML(state.lastSelection)+'</details>':'');
  }
  function results(){
    if(state.kind==='selection')return selectionPanel();
    if(state.kind==='ise')return iseResults();
    const records=state.records.filter(r=>r.evidence_kind.startsWith('historical_prolead'));
    if(!records.length)return '<section class="panel panel-body eng-empty"><h2>PROLEAD工具输出复核</h2><p>加载PROLEAD示例，可查看11条结果路径、7组内容及完整进度记录，并展开日志与配置的原文依据。</p></section>';
    return E.proleadHTML({records,pairings:state.pairings})+records.filter(r=>r.evidence_kind!=='historical_prolead_log').map(r=>'<details class="panel eng-evidence"><summary>'+e(r.file.relative_path||r.file.name)+' · 候选配置 / 命令依据</summary><div class="panel-body"><p class="hash">SHA-256 '+e(r.file.sha256||'未校验')+'</p>'+E.evidenceHTML(r)+'</div></details>').join('');
  }
  function kindBar(){return '<div class="eng-actions eng-kind-bar" role="group" aria-label="工程复核类型">'+btn('ISE资源与时序','kind',state.kind==='ise'?'primary':'','data-kind="ise"')+btn('PROLEAD日志复核','kind',state.kind==='prolead'?'primary':'','data-kind="prolead"')+btn('条件筛选','kind',state.kind==='selection'?'primary':'','data-kind="selection"')+'</div>';}
  function iseInputPanel(){return '<section class="panel panel-body eng-input-panel"><div class="panel-head"><h2>导入ISE资源与时序报告</h2><span class="chip purple">历史输入 · 本次解析</span></div><div class="eng-fields"><label>导入归属<select id="eng-variant"><option value="low-resource-ti" '+(state.variant_id==='low-resource-ti'?'selected':'')+'>低资源门限防护</option><option value="low-randomness-ti" '+(state.variant_id==='low-randomness-ti'?'selected':'')+'>低随机数门限防护</option><option value="all" '+(state.variant_id==='all'?'selected':'')+'>按工程目录识别两方案</option></select></label><label>文本编码<select id="eng-encoding"><option value="utf-8" '+(state.encoding==='utf-8'?'selected':'')+'>UTF-8</option><option value="gb18030" '+(state.encoding==='gb18030'?'selected':'')+'>GB18030</option></select></label><label>来源备注（可选）<input id="eng-source-note" maxlength="240" value="'+e(state.source_note)+'" placeholder="工程版本、归档位置或日期依据"></label></div><p>选择 .syr、.mrp、.par、.twr。文件仅在浏览器中读取，单文件上限5 MiB、每批20 MiB。</p><label class="eng-check"><input id="eng-confirm-bundle" type="checkbox">我确认本次选择的文件属于所选方案的同一工程批次</label><div class="eng-actions">'+btn('选择报告文件','pick','primary',state.busy?'disabled':'')+btn('选择工程目录','directory','',state.busy?'disabled':'')+btn('加载两方案ISE示例','samples','',state.busy?'disabled':'')+(state.busy?btn('取消处理','cancel'):btn('清空复核','clear'))+'</div><input id="eng-files" type="file" accept=".syr,.mrp,.par,.twr,.txt" multiple hidden><input id="eng-directory" type="file" webkitdirectory multiple hidden>'+(state.busy?'<p role="status">正在读取和校验，请稍候…</p>':'')+(state.errors.length?'<div class="errors" role="alert"><strong>此次导入未完成</strong><ul>'+state.errors.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul><p>上一份有效结果保留在下方。</p></div>':'')+'</section>';}
  function iseResults(){
    const records=state.records.filter(r=>r.evidence_kind==='historical_ise_report');
    if(!records.length)return '<section class="panel panel-body eng-empty"><h2>ISE工程报告解析</h2><p>加载两方案ISE示例，按综合、映射、布局布线和时序阶段展示实现指标，并保留文件校验与原文依据。</p></section>';
    return summary()+E.iseGroupsHTML({records,ise_groups:state.ise_groups})+records.map(r=>'<details class="panel eng-evidence" data-eng-record="'+e(r.file_id)+'"><summary>'+e(r.file.name)+' · '+e(r.stage)+' · '+e(E.statusLabel(r))+' · 查看原文依据</summary><div class="panel-body"><p class="eng-path">'+e(r.file.relative_path||r.file.name)+'</p><p class="hash">SHA-256 '+e(r.file.sha256||'—')+'</p>'+E.evidenceHTML(r)+'</div></details>').join('');
  }
  function render(route){
    const heading={workspace:'工程报告复核',compare:'工程复核结果',reports:'工程复核报告',sources:'工程输入与原文依据'}[route];
    return '<header class="page-header"><div><div class="eyebrow">ENGINEERING REVIEW</div><h1>'+heading+'</h1><p>解析工程报告与工具输出，展示实现指标及原文依据。</p></div></header>'+kindBar()+(route==='workspace'&&state.kind!=='selection'?inputPanel():'')+'<section class="panel panel-body eng-export"><p>导出项目文档，包含阶段指标、日志过程、文件校验与当前筛选结果。</p><div class="eng-actions">'+btn('导出复核 HTML','html','primary',(state.records.length||state.selection)&&!state.busy?'':'disabled')+btn('导出复核 JSON','json','',(state.records.length||state.selection)&&!state.busy?'':'disabled')+btn('前往复核工作台','workspace')+'</div></section>'+results();
  }
  function updateSelectionDraft(node){state.selectionInput[node.dataset.selectionField]=node.value;if(state.selection)state.lastSelection=state.selection;state.selection=null;document.querySelectorAll('.eng-selection-result').forEach(n=>n.remove());const label=document.getElementById('selection-draft-status');if(label)label.textContent='输入已改变，请重新筛选；上一份有效结果保留供核对。';}
  function init(api){host=api;
    document.addEventListener('click',async event=>{const node=event.target.closest('[data-eng-action]');if(!node||node.disabled)return;const action=node.dataset.engAction;
      if(action==='case'||action==='engineering'){state.mode=action;refresh();}
      else if(action==='pick')document.getElementById('eng-files').click();
      else if(action==='directory')document.getElementById('eng-directory').click();
      else if(action==='samples')await importSamples();
      else if(action==='kind'){cancel();state.kind=node.dataset.kind;refresh();}
      else if(action==='select'){const r=S.evaluate(state.selectionInput,state.records,state.ise_groups,D.variants);state.selectionErrors=r.errors;if(r.valid){state.selection=r.value;state.lastSelection=null;}refresh();}
      else if(action==='cancel')cancel();else if(action==='clear')cancel(true);
      else if(action==='html'||action==='json')exportReport(action);else if(action==='workspace')host.navigate('workspace');
    });
    document.addEventListener('change',async event=>{
      const id=event.target.id;
      if(event.target.dataset.selectionField){updateSelectionDraft(event.target);return;}
      if(id==='eng-variant'){state.variant_id=event.target.value;cancel(true);}
      else if(id==='eng-encoding'){state.encoding=event.target.value;cancel();}
      else if(id==='eng-files'||id==='eng-directory'){
        let files=[...event.target.files];event.target.value='';
        if(id==='eng-directory')files=files.filter(f=>state.kind==='ise'?/\.(syr|mrp|par|twr)$/i.test(f.name):/^(?:(?:HCC_)?results.*\.txt|config\.set|run\.sh)$/i.test(f.name));
        if(files.some(f=>f.size>5*1024*1024)||files.reduce((n,f)=>n+f.size,0)>20*1024*1024){state.errors=['单文件上限5 MiB，每批合计上限20 MiB。'];refresh();return;}
        await importEntries(files.map(file=>({file})));
      }
    });
    document.addEventListener('input',event=>{if(event.target.dataset.selectionField)updateSelectionDraft(event.target);if(event.target.id==='eng-source-note')state.source_note=event.target.value;});
  }
  root.AESEngineeringUI={init,modeBar,active,render};
})(window);
