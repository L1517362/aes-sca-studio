(function (root) {
  'use strict';
  const conditions = {
    source_id: 'liu-2025-thesis', source_section: '5.8.2', board: 'SAKURA-X',
    device: 'Kintex-7 xc7k160tfbg676-1', scope: 'PicoScope 5244B',
    sampling_rate_msps: 250, clock_mhz: 3, amplifier_db: 30, tool: 'Vivado 2021.2',
    order: 1, threshold_abs_t: 4.5, grouping: '固定明文组与随机明文组', exact_group_counts: null
  };
  const variants = {
    'low-resource-ti': {
      id: 'low-resource-ti', name: '低资源门限防护', shortName: '低资源方案', english: 'LOW RESOURCE',
      description: '函数整合与逻辑复用，优先控制电路资源占用。',
      baselineAsset: 'tvla-area-baseline.png', protectedAsset: 'tvla-area-protected.png',
      growthAsset: 'tvla-area-growth.png', sboxAsset: 'sbox-low-area.png', aesAsset: 'aes-low-area.png',
      baselineFigure: '5.9', protectedFigure: '5.11', growthFigure: '5.10', pdfPage: 110,
      slices: 195, lut: 524, ff: 503, bram: 0, cycles: 236, max_clock_mhz: 145,
      asic_ge: 6806, fresh_random_bits_per_cycle: 22,
      randomness: '每周期 22 比特新鲜额外随机量',
      initialization: '采用论文规定的掩码与随机量条件；初始化总量未在当前案例中量化。',
      detail: '以两分量门限实现为基础，在寄存器分层和分量边界内进行 ANF 化简、乘积项拆分与公共逻辑复用。'
    },
    'low-randomness-ti': {
      id: 'low-randomness-ti', name: '低随机数门限防护', shortName: '低随机数方案', english: 'LOW RANDOMNESS',
      description: '复用随机量与警卫换岗，减轻持续随机源供给压力。',
      baselineAsset: 'tvla-random-baseline.png', protectedAsset: 'tvla-random-protected.png',
      growthAsset: 'tvla-random-growth.png', sboxAsset: 'sbox-low-random.png', aesAsset: 'aes-low-random.png',
      baselineFigure: '5.12', protectedFigure: '5.14', growthFigure: '5.13', pdfPage: 111,
      slices: 212, lut: 561, ff: 563, bram: 0, cycles: 236, max_clock_mhz: 125,
      asic_ge: 7671, fresh_random_bits_per_cycle: 0,
      randomness: '额外新鲜随机量列为 0；仍需随机初始化与复用机制',
      initialization: '23 比特可复用随机量及 8 比特 guard 初始化；按论文的更新规则使用。',
      detail: '通过 Changing-of-the-Guards 机制组织随机量复用与警卫更新，以额外逻辑和寄存器开销换取较低的持续新鲜随机量需求。'
    }
  };
  const sources = [
    {id:'liu-2025-thesis', title:'面向密码芯片的轻量化门限实现侧信道防护技术研究', author:'刘波涛', year:2025, chapter:5, type:'博士论文', note:'主要理论、结构、TVLA 原图及资源表的来源。'},
    {id:'aes-2021', title:'New First-Order Secure AES Performance Records', author:'Aein Rezaei Shahmirzadi, Dušan Božilov, Amir Moradi', year:2021, type:'公开论文', url:'https://doi.org/10.46586/tches.v2021.i2.304-327', note:'表 3 的字节串行、含 PRNG、带 key masking 条目；单列参考，统计口径需核对。'},
    {id:'giii-guide', title:'SASEBO-GIII Quick Start Guide Version 1.0', author:'AIST', year:2013, type:'硬件指南', note:'拨码与测量连接示例，分别出自 PDF 第 4、6 页。'},
    {id:'giii-spec', title:'SASEBO-GIII Specification Version 1.1', author:'AIST', year:2013, type:'规格书', note:'板卡功能与接口图出自 PDF 第 6 页。'},
    {id:'gii-workflow', title:'SASEBO-GII采集流程_LYG0620', author:'既有实验操作资料', type:'采集流程', note:'程序配置、GII 通道与触发接线。'},
    {id:'provided-photos', title:'已提供的设备照片、现场波形照片与采集截图', author:'项目既有材料', type:'照片与截图', note:'说明设备外观和历史采集画面；未验证其与论文曲线属于同一次采集。'}
  ];
  const notes = [
    'TVLA 原图来自既有研究。基线报告 100000 条曲线，防护报告 10000000 条曲线；两组精确样本数与逐点 t 值未提供。',
    '样本量和纵轴范围不同，不以曲线高度或样本量之比计算安全性提升百分比；一阶未越阈不构成完全安全结论。',
    'TVLA 使用 SAKURA-X / Kintex-7 测量条件；FPGA 资源使用 Spartan-6 XC6SLX75 / ISE 14.7，二者分别记录。',
    '低随机数方案仍依赖 23 比特复用随机量、8 比特 guard 初始化与更新机制；原表额外随机数列为 0 不等于没有随机性。',
    '原始采集波形规模约 500GB 为用户提供的估计，当前未随作品提供。截图不替代原始轨迹，当前运行执行案例检查与已有结果加载。'
  ];
  const publicReference = {slices:203,lut:476,ff:529,bram_kbit:108,cycles:216,max_clock_mhz:138,throughput_mbps:81.7,random_bits:8};
  const reportPerformanceTables = {
    source: {
      filename:'SSS小队_AES 侧信道防护对比与报告系统_项目文档.pdf',
      pdf_page:30, document_page:27,
      sha256:'00d70653ceaac83e081aad0b9afc6d0a98a284e4eec93b4131bc8fd3745f6255'
    },
    scheme_note:'本方案 1 对应低资源方案，本方案 2 对应低随机数方案。表中空白及“—”按项目文档保留。',
    tables:[
      {
        id:'asic',number:'3-1',title:'ASIC 平台防护方案性能对比',
        headers:['设计方案','掩码分量个数','S 盒面积','S 盒周期数','AES 盒面积','AES 延迟','AES 周期数','额外随机数'],
        rows:[
          ['Moradi 等人','3','—','—','11114','—','266','48'],
          ['Bilgin 等人','3','—','—','9102','—','246','44'],
          ['Bilgin 等人','3','—','—','11221','—','246','44'],
          ['Bilgin 等人','3','2840','4','8119','—','246','32'],
          ['Sugawara','3','3500','4','17100','—','266','0'],
          ['Gross 等人','2','—','—','','0.89','246','18'],
          ['Shahmirzadi 等人','2','—','6','7619','0.25','246','1'],
          ['Shahmirzadi 等人','2','—','6','8183','0.29','246','0'],
          ['Dhooghe 等人','2','2710','6','8130','—','242','0'],
          ['Yao 等人','2','—','6','7843','0.94','236','4'],
          ['本方案 1','2','2111','6','6806','1.26','236','22'],
          ['本方案 2','2','2686','6','7671','1.10','236','0']
        ]
      },
      {
        id:'fpga',number:'3-2',title:'FPGA 平台防护方案性能对比',
        headers:['设计方案','slices','LUTs','FFs','BRAM','周期数','最大时钟频率','额外随机数'],
        rows:[
          ['Gross 等人','433','894','726','0','216','110','28'],
          ['Gross 等人','351','792','754','0','246','134','18'],
          ['De Cnudde 等人','418','905','690','0','276','133','54'],
          ['Wegener 等人','254','347','124','0','6852','103','18'],
          ['Wegener 等人','140','248','92','0','6852','120','6'],
          ['Shahmirzadi 等人','631','1021','866','0','246','136','0'],
          ['Shahmirzadi 等人','203','476','529','108kb','216','138','8'],
          ['本方案 1','195','524','503','0','236','145','22'],
          ['本方案 2','212','561','563','0','236','125','0']
        ]
      }
    ]
  };
  const data = {version:'1.0.0', schemaVersion:'1.1', conditions, variants, sources, notes, publicReference, reportPerformanceTables,
    resourceEnvironment: {platform:'Spartan-6 XC6SLX75',tool:'ISE Design Suite 14.7',source_id:'liu-2025-thesis',table:'5.4'},
    asicEnvironment: {platform:'NanGate 45nm',tool:'Design Compiler v2016.03',source_id:'liu-2025-thesis',table:'5.3'}
  };
  root.AESData = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
