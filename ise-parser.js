/* ISE report reader. Reports are data; no external tools are executed. */
(function(root){
  'use strict';
  const E=root.AESEngineering||(typeof require==='function'?require('./engineering.js'):null);
  const number=s=>Number(s.replace(/,/g,''));
  function parseIseReport(text,meta={}){
    const r=E.record(text,meta,'historical_ise_report','ise-text');
    if(E.invalidText(r))return r;
    const header=r.lines.findIndex(line=>/^Release\s+[\d.]+\s+(?:-\s*)?(xst|Map|par|Trace)\b/i.test(line));
    if(header<0){r.status='unsupported';r.errors.push('未识别ISE XST/MAP/PAR/Trace报告头。');return r;}
    const h=r.lines[header].match(/^Release\s+([\d.]+)\s+(?:-\s*)?(xst|Map|par|Trace)\b/i);
    r.stage={xst:'XST',map:'MAP',par:'PAR',trace:'TWR'}[h[2].toLowerCase()];r.report_kind=r.stage;
    E.field(r,'tool_version',h[1],header,null,'ISE');
    function first(key,re,convert=x=>x,unit=null,kind=null,start=0,end=r.lines.length){
      for(let n=start;n<end;n++){const m=r.lines[n].match(re);if(m){E.field(r,key,convert(m[1]),n,unit,kind);return n;}}return -1;
    }
    first('top_module',/^\s*(?:Top Module Name|Top Module|Design Name)\s*:\s*["']?([\w$]+)/i);
    if(E.value(r,'top_module')===null)first('top_module',/Report File for Design\s+'([^']+)'/i);
    if(E.value(r,'top_module')===null)first('top_module',/"([^"/\\]+)" is an NCD/i);
    if(E.value(r,'top_module')===null)first('top_module',/^\s*Design file:\s*(?:.*[/\\])?([^\s/\\]+)\.ncd/i);
    const deviceLines=r.lines.map((s,n)=>({s,n})).filter(x=>/Target Device|Selected Device|device xc|Device,package,speed/i.test(x.s));
    for(const {s,n} of deviceLines){
      const device=s.match(/\b(xc[0-9a-z]+)/i);if(device&&!r.fields.device)E.field(r,'device',device[1].toLowerCase(),n);
      const pkg=s.match(/\b((?:csg|fgg|ffg|ftg|tqg|clg|cpg)\d+)/i);if(pkg&&!r.fields.package)E.field(r,'package',pkg[1].toLowerCase(),n);
      const speed=s.match(/(?:speed\s+|,\s*|(?:csg|fgg|ffg|ftg|tqg|clg|cpg)\d+)(-\d+)\b/i)||s.match(/xc[0-9a-z]+(-\d+)-/i);
      if(speed&&!r.fields.speed)E.field(r,'speed',speed[1],n);
    }
    if(!r.fields.package)first('package',/^Target Package\s*:\s*(\S+)/i,x=>x.toLowerCase());
    if(!r.fields.speed)first('speed',/^Target Speed\s*:\s*(-\d+)/i);
    first('input_date_raw',/^\s*(?:Mapped Date|Date)\s*:\s*(.+)$/i);
    if(r.fields.input_date_raw)r.input_date={value:E.value(r,'input_date_raw'),basis:'report_text'};
    const summary=r.lines.findIndex(line=>/^(?:Device [Uu]tilization [Ss]ummary|Design Summary)\s*:?\s*$/.test(line.trim()));
    if(r.stage!=='TWR'){
      const start=Math.max(0,summary);
      first('register_count',/^\s*Number of Slice Registers:\s*([\d,]+)\s+out of\b/i,number,'registers',r.stage,start);
      first('lut_count',/^\s*Number of Slice LUTs:\s*([\d,]+)\s+out of\b/i,number,'LUT',r.stage,start);
      first('slice_count',/^\s*Number of occupied Slices:\s*([\d,]+)\s+out of\b/i,number,'slices',r.stage,start);
      first('bram16_count',/^\s*Number of RAMB16BWERs:\s*([\d,]+)\s+out of\b/i,number,'RAMB16BWER blocks',r.stage,start);
      first('bram8_count',/^\s*Number of RAMB8BWERs:\s*([\d,]+)\s+out of\b/i,number,'RAMB8BWER blocks',r.stage,start);
    }
    if(r.stage==='XST'){
      first('period_ns',/Minimum period:\s*([\d.]+)ns/i,Number,'ns','default_synthesis_estimate');
      first('frequency_mhz',/Maximum Frequency:\s*([\d.]+)MHz/i,Number,'MHz','default_synthesis_estimate');
    }else if(r.stage==='PAR'){
      first('period_ns',/Autotimespec constraint.*\|\s*SETUP\s*\|\s*N\/A\s*\|\s*([\d.]+)ns/i,Number,'ns','automatic_performance_evaluation');
    }else if(r.stage==='TWR'){
      const n=r.lines.findIndex(line=>/^\s*Clock to Setup on destination clock\b/i.test(line));
      if(n>=0)first('clock_to_setup_ns',/^\s*[^|]+\|\s*([\d.]+)\|/i,Number,'ns','clock_to_setup_default_enumeration',n+1,Math.min(n+12,r.lines.length));
    }
    const noConstraints=r.lines.findIndex(line=>/No timing constraints found|No user timing constraints were detected|not defined timing requirements/i.test(line));
    if(noConstraints>=0){E.field(r,'constraints_state','no_user_constraints',noConstraints);r.warnings.push('无用户时序约束；自动分析不代表目标频率签核或板上实测Fmax。');}
    else r.constraints_state='not_demonstrated';
    for(let n=0;n<r.lines.length;n++)if(/^\s*(?:WARNING|ERROR):/i.test(r.lines[n]))r.warnings.push('L'+(n+1)+': '+r.lines[n]);
    const required=['top_module','device','package','speed',...(r.stage==='TWR'?['clock_to_setup_ns','constraints_state']:['register_count','lut_count']),...(r.stage==='PAR'?['slice_count','period_ns']:r.stage==='XST'?['period_ns','frequency_mhz']:r.stage==='MAP'?['slice_count']:[])];
    r.missing_fields=required.filter(key=>!r.fields[key]);
    r.status=r.missing_fields.length?'partial':'complete';
    if(r.missing_fields.length)r.warnings.push('缺少字段：'+r.missing_fields.join('、'));
    const extension={XST:'.syr',MAP:'.mrp',PAR:'.par',TWR:'.twr'}[r.stage];
    if(meta.name&&/\.[a-z]+$/i.test(meta.name)&&!meta.name.toLowerCase().endsWith(extension))r.warnings.push('扩展名与报告头不同；按报告头识别为'+r.stage+'。');
    return r;
  }
  function groupIseReports(records,baselines={}){
    const buckets=new Map();
    for(const r of records.filter(r=>r.evidence_kind==='historical_ise_report'&&['complete','partial'].includes(r.status))){
      const key=JSON.stringify([r.variant_id,r.bundle_id||'unconfirmed']);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);
    }
    return [...buckets.values()].map(items=>{
      const group={variant_id:items[0].variant_id,bundle_id:items[0].bundle_id,record_ids:items.map(r=>r.file_id),association_state:items.every(r=>r.association_state==='confirmed')?'confirmed':'unconfirmed',missing_reports:['XST','MAP','PAR','TWR'].filter(stage=>!items.some(r=>r.stage===stage)),conflicts:[],differences:[]};
      for(const key of ['device','package','speed','top_module','tool_version']){const vals=[...new Set(items.map(r=>E.value(r,key)).filter(x=>x!==null))];if(vals.length>1)group.conflicts.push(key+': '+vals.join(' / '));}
      for(const stage of ['XST','MAP','PAR','TWR'])if(items.filter(r=>r.stage===stage).length>1)group.conflicts.push('同一分组内'+stage+'报告重复，请确认构建批次。');
      if(group.conflicts.length)group.association_state='conflict';
      const base=baselines[group.variant_id];
      if(base)for(const r of items.filter(r=>['MAP','PAR'].includes(r.stage)))for(const [key,baseKey] of [['register_count','ff'],['lut_count','lut'],['slice_count','slices']]){const v=E.value(r,key);if(v!==null&&base[baseKey]!==undefined&&v!==base[baseKey])group.differences.push({field:key,stage:r.stage,historical_value:v,baseline_value:base[baseKey],record_id:r.file_id,reason:'历史工程与当前正文基准不同，保留各自来源。'});}
      group.status=group.missing_reports.length||group.conflicts.length?'partial':'complete';return group;
    });
  }
  const api={parseIseReport,groupIseReports};root.AESIseParser=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
