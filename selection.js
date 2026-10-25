/* Engineering constraint filtering; no security score or fabricated measurements. */
(function(root){
  'use strict';
  const E=root.AESEngineering||(typeof require==='function'?require('./engineering.js'):null);
  const numeric=['slices','lut','ff','max_cycles','max_period_ns','min_throughput_mbps','fresh_supply','reusable_bits','guard_bits'];
  function validate(input){
    const errors=[],v={...input};
    for(const key of numeric){const x=input[key];if(x===''||x===null||x===undefined){v[key]=null;continue;}
      if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(x).trim())||!Number.isFinite(Number(x))||Number(x)<0)errors.push(key+'必须是非负有限数值。');else v[key]=Number(x);
    }
    if(!['fpga','asic'].includes(v.platform))errors.push('请选择FPGA或ASIC平台。');
    if(!['parsed','baseline'].includes(v.source))errors.push('请选择明确的数据来源。');
    if(!['XST','MAP','PAR','documented_fpga'].includes(v.stage))errors.push('请选择明确的实现阶段。');
    if(!['signed','reference'].includes(v.timing_policy))errors.push('请选择时序保证或参考估算。');
    for(const key of ['initialization','guard_update'])if(!['unknown','available','unavailable'].includes(v[key]))errors.push('初始化和guard条件必须明确选择。');
    return {valid:!errors.length,errors,value:v};
  }
  const device=r=>[E.value(r,'device'),E.value(r,'package'),E.value(r,'speed')].filter(x=>x!==null).join('-').replace('--','-');
  function candidates(records,groups,variants,input){
    return Object.values(variants).map(base=>{
      const shared={variant_id:base.id,name:base.name,fresh_bits:base.fresh_random_bits_per_cycle,reusable_bits:base.id==='low-randomness-ti'?23:null,guard_bits:base.id==='low-randomness-ti'?8:null,random_source:'当前项目案例随机量条件'};
      if(input.source==='baseline')return {...shared,source:'当前正文FPGA性能表',source_kind:'baseline',platform:'fpga',device:null,stage:'documented_fpga',association_state:'documented_values_device_unconfirmed',metrics:{slices:base.slices,lut:base.lut,ff:base.ff,cycles:base.cycles,frequency_mhz:base.max_clock_mhz,period_ns:null},frequency_kind:'documented_reference',signed_timing:false,record_id:null,sha256:null};
      const rs=records.filter(r=>r.evidence_kind==='historical_ise_report'&&r.variant_id===base.id&&r.stage===input.stage);
      if(rs.length!==1)return {...shared,source:'历史ISE '+input.stage,source_kind:'parsed',platform:'fpga',device:null,stage:input.stage,association_state:rs.length?'ambiguous':'missing',metrics:{},signed_timing:false,record_id:null,sha256:null};
      const r=rs[0],g=groups.find(g=>g.record_ids.includes(r.file_id));
      return {...shared,source:'历史ISE '+r.stage+' · '+(r.file.relative_path||r.file.name),source_kind:'parsed',platform:'fpga',device:device(r)||null,stage:r.stage,association_state:g?.association_state||r.association_state,
        metrics:{slices:E.value(r,'slice_count'),lut:E.value(r,'lut_count'),ff:E.value(r,'register_count'),cycles:null,frequency_mhz:E.value(r,'frequency_mhz'),period_ns:E.value(r,'period_ns')},
        frequency_kind:r.fields.frequency_mhz?.kind||r.fields.period_ns?.kind||null,signed_timing:false,record_id:r.file_id,sha256:r.file.sha256,constraints_state:E.value(r,'constraints_state')};
    });
  }
  function evaluate(raw,records,groups,variants){
    const validation=validate(raw);if(!validation.valid)return validation;
    const input=validation.value,items=candidates(records,groups,variants,input);
    const result={selection_version:'1.0',generated_at:new Date().toISOString(),input,statement:'按所选工程条件筛选；不生成安全评分，参考估算不构成速度保证。',candidates:[]};
    for(const c of items){const checks=[];const add=(constraint,state,value,limit,unit,reason,source=c.source)=>checks.push({constraint,state,value:value??null,limit:limit??null,unit,reason,source});
      let comparable=true;
      const why=[];
      if(input.platform!==c.platform){why.push('平台不同，不能将FPGA资源直接用于ASIC。');comparable=false;}
      if(!input.device?.trim()||!c.device){why.push('目标器件或来源器件未确认。');comparable=false;}
      else if(input.device.trim().toLowerCase()!==c.device.toLowerCase()){why.push('器件不同，不能直接比较或排序。');comparable=false;}
      if(input.stage!==c.stage){why.push('实现阶段不同。');comparable=false;}
      if(c.source_kind==='parsed'&&c.association_state!=='confirmed'){why.push('工程批次关联尚未确认或存在冲突。');comparable=false;}
      add('comparison_basis',comparable?'satisfied':'insufficient_information',c.device,input.device,'器件 / 阶段',comparable?'同器件、同阶段；逐项核对条件。':why.join(' '));
      if(!['slices','lut','ff','max_cycles','max_period_ns','min_throughput_mbps','fresh_supply'].some(k=>input[k]!==null))add('selected_conditions','insufficient_information',null,null,'条件','尚未填写资源、速度或持续随机量约束。');
      for(const key of ['slices','lut','ff','max_cycles'])if(input[key]!==null){const metric=key==='max_cycles'?'cycles':key,v=c.metrics[metric],ok=comparable&&v!==null&&v!==undefined;
        add(key,ok?(v<=input[key]?'satisfied':'not_satisfied'):'insufficient_information',v,input[key],key==='max_cycles'?'cycles':key,ok?'需求不得超过上限。':'当前来源未提供可直接比较的值。');}
      for(const key of ['max_period_ns','min_throughput_mbps'])if(input[key]!==null){
        const value=key==='max_period_ns'?c.metrics.period_ns:(c.metrics.frequency_mhz&&c.metrics.cycles?128*c.metrics.frequency_mhz/c.metrics.cycles:null);
        const known=comparable&&value!==null&&value!==undefined&&(input.timing_policy==='reference'||c.signed_timing);
        add(key,known?((key==='max_period_ns'?value<=input[key]:value>=input[key])?'satisfied':'not_satisfied'):'insufficient_information',value,input[key],key==='max_period_ns'?'ns':'Mbit/s',known?'采用用户所选的参考估算；未计通信及随机源开销。':'缺少匹配的周期/频率依据或经过约束确认的时序；默认分析不提供速度保证。');
      }
      if(input.fresh_supply!==null){
        add('fresh_supply',c.fresh_bits===null?'insufficient_information':c.fresh_bits<=input.fresh_supply?'satisfied':'not_satisfied',c.fresh_bits,input.fresh_supply,'bits/cycle','持续额外新鲜随机量；初始化条件另外检查。',c.random_source);
        if(c.variant_id==='low-randomness-ti'){
          for(const [key,needed] of [['reusable_bits',23],['guard_bits',8]])add(key,input[key]===null?'insufficient_information':input[key]>=needed?'satisfied':'not_satisfied',input[key],needed,'bits','低持续随机量仍需23比特复用随机量和8比特guard初始化。',c.random_source);
          for(const key of ['initialization','guard_update'])add(key,input[key]==='unknown'?'insufficient_information':input[key]==='available'?'satisfied':'not_satisfied',input[key],'available','条件','必须满足原设计的初始化及guard更新规则。',c.random_source);
        }else add('initialization',input.initialization==='unavailable'?'not_satisfied':'insufficient_information',input.initialization,null,'条件','本案例初始化总量未量化，不能视为0；需单独确认原设计条件。',c.random_source);
      }
      const state=checks.some(x=>x.state==='not_satisfied')?'not_satisfied':checks.some(x=>x.state==='insufficient_information')?'insufficient_information':'satisfied';
      const mhz=c.metrics.frequency_mhz;
      result.candidates.push({...c,state,checks,nominal_throughput:mhz?{value:128*mhz/236,unit:'Mbit/s',formula:'128 × MHz / 236',frequency_mhz:mhz,frequency_source:c.source,cycles:236,cycles_source:'当前项目案例参考周期；不是ISE报告解析字段',statement:'名义估算，未计通信及随机源开销，不是新增板上测量或签核'}:null});
    }
    return {valid:true,errors:[],value:result};
  }
  const api={validate,candidates,evaluate};root.AESSelection=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
