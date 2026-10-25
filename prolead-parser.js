/* Parse archived PROLEAD text, configuration and command files without executing them. */
(function(root){
  'use strict';
  const E=root.AESEngineering||(typeof require==='function'?require('./engineering.js'):null);
  const numeric=s=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)&&Number.isFinite(Number(s));
  function parseProleadLog(text,meta={}){
    const r=E.record(text,meta,'historical_prolead_log','prolead-log-text');r.events=[];r.unsupported_rows=[];r.mode=null;r.tool_version=null;
    r.completion_state='unconfirmed';r.last_status=null;r.ever_leakage=false;r.leakage_count=0;r.config_pairing_state='unconfirmed';
    if(E.invalidText(r))return r;
    if(!r.lines.some(line=>/Start Hardware Leakage Evaluation|Evaluate security under/i.test(line))){r.status='unsupported';r.errors.push('未识别PROLEAD硬件泄漏评估日志。');return r;}
    let statisticName=null,segment=0,lastCount=null,lastElapsed=null;
    for(let n=0;n<r.lines.length;n++){
      const line=r.lines[n];let m;
      if((m=line.match(/PROLEAD\s+(?:version\s*)?v?([\d]+\.[\d.]+)/i)))E.field(r,'tool_version',m[1],n);
      if((m=line.match(/under the (.+?) model!/i)))E.field(r,'model',m[1],n);
      if((m=line.match(/Prepare shared data for\s+(\d+) threads/i)))E.field(r,'threads',Number(m[1]),n,'threads');
      if((m=line.match(/^Module name:\s*(.+)$/i)))E.field(r,'top_module',m[1].trim(),n);
      if((m=line.match(/^Settings file:\s*(.+)$/i)))E.field(r,'settings_file',m[1].trim(),n);
      if((m=line.match(/\b(compact|normal)[ _-]mode\b/i)))E.field(r,'mode',m[1].toLowerCase(),n);
      if(/\bWarning\b/.test(line)&&!/^Read .*0 warnings/.test(line))r.warnings.push('L'+(n+1)+': '+line);
      if(/Processed Simulations/.test(line)&&/Status/.test(line)){
        const parts=line.split('|').slice(1,-1).map(x=>x.trim());statisticName=parts[4]||null;
        E.field(r,'statistic_name',statisticName,n);continue;
      }
      if((m=line.match(/^Evaluation done in\s+([\d.]+)\s+(seconds|s)!/i))){
        r.completion_state='completed';E.field(r,'termination_text',line,n);E.field(r,'evaluation_seconds',Number(m[1]),n,'s');continue;
      }
      if(!/^\|\s*[\d.]+(?:s|ms|h)\s*\|/.test(line))continue;
      const cells=line.split('|').slice(1,-1).map(x=>x.trim());
      if(cells.length!==6){r.unsupported_rows.push({line_number:n+1,raw_text:line,reason:'未知进度列数'});continue;}
      const elapsed=cells[0].match(/^([\d.]+)(s|ms|h)$/),memory=cells[1].match(/^([\d.]+)([A-Za-z]+)$/);
      const count=cells[2].match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
      if(!elapsed||!memory||!count){r.unsupported_rows.push({line_number:n+1,raw_text:line,reason:'时间、内存或计数无法识别'});continue;}
      const elapsedSeconds=Number(elapsed[1])*({s:1,ms:.001,h:3600}[elapsed[2]]);
      const simulationCount=Number(count[1]);
      if(lastCount!==null&&(simulationCount<lastCount||elapsedSeconds<lastElapsed))segment++;
      const event={line_number:n+1,raw_text:line,batch_id:segment,simulation_count:simulationCount,
        counter_raw:cells[2],secondary_counter:count[2]?Number(count[2]):null,secondary_counter_kind:count[2]?'unconfirmed':null,
        probe_set:cells[3],statistic_name:statisticName,statistic_value:numeric(cells[4])?Number(cells[4]):null,
        status:cells[5],elapsed_value:Number(elapsed[1]),elapsed_unit:elapsed[2],memory_value:Number(memory[1]),memory_unit:memory[2]};
      r.events.push(event);lastCount=simulationCount;lastElapsed=elapsedSeconds;
    }
    r.mode=E.value(r,'mode');r.tool_version=E.value(r,'tool_version');
    r.counter_format=r.events.some(x=>x.secondary_counter!==null)?'paired_counters':'single_counter';
    r.last_status=r.events.at(-1)?.status||null;r.leakage_count=r.events.filter(x=>x.status==='LEAKAGE').length;r.ever_leakage=r.leakage_count>0;
    r.segment_count=r.events.length?segment+1:0;r.final_simulation_count=r.events.at(-1)?.simulation_count??null;
    const last=r.events.at(-1);if(last)E.field(r,'simulation_count',last.simulation_count,last.line_number-1,'simulations','last_progress_record');
    if(r.mode===null)r.warnings.push('日志未明确给出compact/normal模式；计数列格式单独保留，不按目录补写模式。');
    if(r.tool_version===null)r.warnings.push('日志未提供工具版本。');
    if(r.unsupported_rows.length)r.warnings.push(r.unsupported_rows.length+'条进度行无法完整识别，原文已保留。');
    if(r.completion_state!=='completed')r.warnings.push('未找到完整Evaluation done结束文字，运行完成状态未确认。');
    const unknown=r.events.some(x=>!['OKAY','LEAKAGE'].includes(x.status)||x.statistic_value===null);
    if(unknown)r.warnings.push('部分记录包含未知状态或统计值，不自动判定安全性。');
    if(statisticName!=='-log10(p)')r.warnings.push('未知统计量格式，保留原值和原文；不使用TVLA阈值。');
    r.status=r.events.length&&r.completion_state==='completed'&&!r.unsupported_rows.length&&!unknown&&statisticName==='-log10(p)'?'complete':'partial';
    return r;
  }
  function parseProleadConfig(text,meta={}){
    const r=E.record(text,meta,'historical_prolead_config','prolead-config-text');if(E.invalidText(r))return r;
    const keys={max_no_of_threads:'threads',no_of_simulations:'simulation_count',no_of_step_simulations:'step_simulations',no_of_step_write_results:'write_step',order_of_test:'order',max_clock_cycle:'max_clock_cycle',compact_distributions:'compact_distributions',transitional_leakage:'transitional_leakage',multivariate_test:'multivariate_test'};
    for(let n=0;n<r.lines.length;n++){
      const raw=r.lines[n].split('%')[0].trim(),key=raw.split(/\s+/)[0];if(!keys[key])continue;
      let v=raw.slice(key.length).trim(),end=n;
      if(!v){for(let k=n+1;k<r.lines.length;k++){const next=r.lines[k].split('%')[0].trim();if(next){v=next;end=k;break;}}}
      const value=/^\d+$/.test(v)?Number(v):/^(yes|no)$/.test(v)?v:null;
      if(value===null){r.warnings.push('L'+(n+1)+'配置值无法识别：'+key);continue;}
      E.field(r,keys[key],value,n);r.fields[keys[key]].line_end=end+1;r.fields[keys[key]].raw_text=r.lines.slice(n,end+1).join('\n');
    }
    if(!Object.keys(r.fields).length){r.status='unsupported';r.errors.push('未识别PROLEAD配置键。');return r;}
    r.status=['threads','simulation_count','order','compact_distributions'].every(key=>r.fields[key])?'complete':'partial';return r;
  }
  function parseProleadCommand(text,meta={}){
    const r=E.record(text,meta,'historical_prolead_command','prolead-command-text');if(E.invalidText(r))return r;
    for(let n=0;n<r.lines.length;n++){
      const line=r.lines[n];if(line.trim().startsWith('#'))continue;
      if(/\bPROLEAD\b/.test(line)){
        E.field(r,'command_text',line,n);
        for(const [flag,key] of [['cf','config_path'],['lf','library_path'],['df','design_path']]){
          const match=line.match(new RegExp('(?:^|\\s)-'+flag+'\\s+(?:"([^"]+)"|\'([^\']+)\'|([^\\s|]+))'));
          if(match)E.field(r,key,match[1]||match[2]||match[3],n);
        }
      }
    }
    r.status=r.fields.command_text?'complete':'unsupported';if(r.status==='unsupported')r.errors.push('未识别PROLEAD命令文本。');
    r.warnings.push('本文件仅作为命令文本读取，未执行。');return r;
  }
  function compareLogConfig(log,config,command=null){
    const result={log_id:log.file_id,config_id:config?.file_id||null,command_id:command?.file_id||null,state:'unconfirmed',differences:[],reasons:[]};
    if(!config){result.reasons.push('未选择候选配置。');return result;}
    for(const [key,logValue,configValue] of [['threads',E.value(log,'threads'),E.value(config,'threads')],['simulation_count',log.final_simulation_count,E.value(config,'simulation_count')]]){
      if(logValue!==null&&configValue!==null&&logValue!==configValue)result.differences.push({field:key,log_value:logValue,config_value:configValue,log_line:log.fields[key]?.line_start||null,config_line:config.fields[key]?.line_start||null});
    }
    if(log.variant_id!==config.variant_id||log.bundle_id!==config.bundle_id)result.reasons.push('方案或用户选定批次不同。');
    if(result.differences.length)result.reasons.push('日志与候选配置有差异；命令行覆盖、版本或副本身份尚未确认，不据此判运行错误。');
    else result.reasons.push('已识别字段相容；同目录或字段相同不能单独证明运行配对。');
    return result;
  }
  function pairRecords(records){return records.filter(r=>r.evidence_kind==='historical_prolead_log').map(log=>{
    const configs=records.filter(r=>r.evidence_kind==='historical_prolead_config'&&r.bundle_id===log.bundle_id&&r.variant_id===log.variant_id);
    const command=records.find(r=>r.evidence_kind==='historical_prolead_command'&&r.bundle_id===log.bundle_id&&r.variant_id===log.variant_id);
    if(configs.length!==1)return {log_id:log.file_id,config_id:null,command_id:command?.file_id||null,state:'unconfirmed',differences:[],reasons:[configs.length?'同批次存在多份配置，需明确选择配对。':'未导入对应候选配置。']};
    return compareLogConfig(log,configs[0],command);
  });}
  const api={parseProleadLog,parseProleadConfig,parseProleadCommand,compareLogConfig,pairRecords};root.AESProleadParser=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
