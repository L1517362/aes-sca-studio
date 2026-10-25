(function (root) {
  'use strict';
  const projectDocument = {title:'AES侧信道防护对比与报告系统项目文档'};
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
    {id:'liu-2025-thesis', title:projectDocument.title, author:'SSS 小队', year:2026, type:'项目文档', note:'集中呈现方案结构、检测图、性能表与参考文献。'},
    {id:'giii-guide', title:'SASEBO-GIII Quick Start Guide Version 1.0', author:'AIST', year:2013, type:'设备资料', note:'项目文档图 3-4、图 3-6 对应的拨码与测量连接资料。'},
    {id:'giii-spec', title:'Side-channel Attack Standard Evaluation Board SASEBO-GIII Specification: Version 1.1', author:'AIST', year:2013, type:'设备资料', reference_number:4, note:'对应项目文档参考文献 [4]，用于板卡功能与接口说明。'},
    {id:'gii-workflow', title:'SASEBO-GII采集流程_LYG0620', author:'项目提供材料', type:'采集资料', note:'程序配置、GII 通道与触发接线的配套操作材料。'},
    {id:'provided-photos', title:'设备照片、现场波形照片与采集截图', author:'项目提供材料', type:'照片与截图', note:'展示项目设备连接、现场波形及采集界面，采集参数随图像记录列示。'}
  ];
  const referenceDocument = {
  "filename": "SSS小队_AES 侧信道防护对比与报告系统_项目文档.pdf",
  "title": projectDocument.title,
  "author": "SSS 小队",
  "sha256": "00d70653ceaac83e081aad0b9afc6d0a98a284e4eec93b4131bc8fd3745f6255",
  "reference_pdf_pages": [
    39,
    40
  ],
  "reference_document_pages": [
    36,
    37
  ],
  "reference_count": 16,
  "updated_on": "2026-10-18"
};
  const references = [
  {
    "number": 1,
    "text": "李兆宗. 关于《中华人民共和国密码法(草案)》的说明——2019 年 6 月 25 日在第十三届全国人民代表大会常务委员会第十一次会议上[J].中华人民共和国全国人民代表大会常务委员会公报,2019(6): 917-919."
  },
  {
    "number": 2,
    "text": "冯登国. 信息技术助推商用密码创新发展[J]. 中国信息安全,2023(7): 20-22."
  },
  {
    "number": 3,
    "text": "Ishai Y, Sahai A, Wagner D. Private circuits: Securing hardware against probing attacks[C]//Advances in Cryptology-CRYPTO 2003: 23rd Annual International Cryptology Conference, Santa Barbara, California, USA, August 17-21, 2003. Proceedings 23. Springer, 2003: 463-481."
  },
  {
    "number": 4,
    "text": "AIST. Side-channel Attack Standard Evaluation Board SASEBO-GIII Specification: Version 1.1[EB/OL]. 2013-04-26."
  },
  {
    "number": 5,
    "text": "Nikova S, Rechberger C, Rijmen V. Threshold implementations against side-channel attacks and glitches[C]//International conference on information and communications security-ICICS 2006. Springer, 2006: 529-545."
  },
  {
    "number": 6,
    "text": "Groß H, Mangard S, Korak T. Domain-oriented masking: Compact masked hardware implementations with arbitrary protection order[J]. Cryptology ePrint Archive, 2016: 486."
  },
  {
    "number": 7,
    "text": "Daemen J. Changing of the guards: A simple and efficient method for achieving uniformity in threshold sharing[C]//International Conference on Cryptographic Hardware and Embedded Systems CHES 2017. Springer, 2017: 137-153."
  },
  {
    "number": 8,
    "text": "Askeland A, Dhooghe S, Nikova S, et al. Guarding the first order: The rise of aes maskings[C]//International Conference on Smart Card Research and Advanced Applications- CARDIS 2022.Springer, 2022: 103-122."
  },
  {
    "number": 9,
    "text": "Nikova S, Rijmen V, Schläffer M. Secure hardware implementation of nonlinear functions in the presence of glitches[J]. Journal of Cryptology, 2011, 24(2): 292-321."
  },
  {
    "number": 10,
    "text": "Shahmirzadi A R, Moradi A. Re-consolidating first-order masking schemes: Nullifying fresh randomness[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2021, 2021(1): 305-342."
  },
  {
    "number": 11,
    "text": "Wu L, Fan Y, Wang W, et al. Extending randomness-free first-order masking schemes and applications to masking-friendly s-boxes[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2025, 2025(1): 340-366."
  },
  {
    "number": 12,
    "text": "Bilgin B, Gierlichs B, Nikova S, et al. Higher-order threshold implementations[C]//Advances in Cryptology–ASIACRYPT 2014: 20th International Conference on the Theory and Application of Cryptology and Information Security, Kaoshiung, Taiwan, ROC, December 7-11, 2014, Proceedings, Part II 20. Springer, 2014: 326-343."
  },
  {
    "number": 13,
    "text": "赵静远,徐松艳,张子剑,等. 轻量级分组密码算法 GIFT 的差分分析[J]. 密码学报,2018,5(4):335-343."
  },
  {
    "number": 14,
    "text": "Bilgin B, Gierlichs B, Nikova S, et al. Trade-offs for threshold implementations illustrated on aes[J]. IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems, 2015, 34(7):1188-1200."
  },
  {
    "number": 15,
    "text": "SAKURA. Side-channel attack user reference architecture[EB/OL]. https://satoh.cs.uec.ac.jp/SAKURA/index.html, Last accessed on: 2024-3-16.",
    "url": "https://satoh.cs.uec.ac.jp/SAKURA/index.html"
  },
  {
    "number": 16,
    "text": "Yao F, Chen H, Wei Y, et al. Optimizing aes threshold implementation under the glitch-extended probing model[J]. IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems, 2024, 43(7): 1984-1997."
  }
];
  const comparisonReferences = [
    {
      id:'cmp-moradi-2011',label:'C1',source_reference_number:120,current_reference_numbers:[],
      text:'Moradi A, Poschmann A, Ling S, et al. Pushing the limits: A very compact and a threshold implementation of AES[C]//Advances in Cryptology–EUROCRYPT 2011. Springer, 2011: 69-88.'
    },
    {
      id:'cmp-bilgin-2014',label:'C2',source_reference_number:122,current_reference_numbers:[],
      text:'Bilgin B, Gierlichs B, Nikova S, et al. A more efficient AES threshold implementation[C]//Progress in Cryptology–AFRICACRYPT 2014. Springer, 2014: 267-284.'
    },
    {
      id:'cmp-bilgin-2015',label:'C3',source_reference_number:107,current_reference_numbers:[14],
      text:'Bilgin B, Gierlichs B, Nikova S, et al. Trade-offs for threshold implementations illustrated on AES[J]. IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems, 2015, 34(7): 1188-1200.'
    },
    {
      id:'cmp-sugawara-2019',label:'C4',source_reference_number:123,current_reference_numbers:[],
      text:'Sugawara T. 3-share threshold implementation of AES S-box without fresh randomness[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2019, 2019(1): 123-145.'
    },
    {
      id:'cmp-gross-2016',label:'C5',source_reference_number:49,current_reference_numbers:[6],
      text:'Groß H, Mangard S, Korak T. Domain-oriented masking: Compact masked hardware implementations with arbitrary protection order[J]. Cryptology ePrint Archive, 2016: 486.'
    },
    {
      id:'cmp-shahmirzadi-2021',label:'C6',source_reference_number:72,current_reference_numbers:[10],
      text:'Shahmirzadi A R, Moradi A. Re-consolidating first-order masking schemes: Nullifying fresh randomness[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2021, 2021(1): 305-342.'
    },
    {
      id:'cmp-askeland-2022',label:'C7',source_reference_number:54,current_reference_numbers:[8],
      text:'Askeland A, Dhooghe S, Nikova S, et al. Guarding the first order: The rise of AES maskings[C]//International Conference on Smart Card Research and Advanced Applications–CARDIS 2022. Springer, 2022: 103-122.'
    },
    {
      id:'cmp-yao-2024',label:'C8',source_reference_number:124,current_reference_numbers:[16],
      text:'Yao F, Chen H, Wei Y, et al. Optimizing AES threshold implementation under the glitch-extended probing model[J]. IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems, 2024, 43(7): 1984-1997.'
    },
    {
      id:'cmp-de-cnudde-2016',label:'C9',source_reference_number:141,current_reference_numbers:[],
      text:'De Cnudde T, Reparaz O, Bilgin B, et al. Masking AES with shares in hardware[C]//International Conference on Cryptographic Hardware and Embedded Systems–CHES 2016. Springer, 2016: 194-212.'
    },
    {
      id:'cmp-wegener-2018',label:'C10',source_reference_number:105,current_reference_numbers:[],
      text:'Wegener F, De Meyer L, Moradi A. Spin me right round: Rotational symmetry for FPGA-specific AES[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2018, 2018(3): 596-626.'
    },
    {
      id:'cmp-wegener-2020',label:'C11',source_reference_number:106,current_reference_numbers:[],
      text:'Wegener F, De Meyer L, Moradi A. Spin me right round rotational symmetry for FPGA-specific AES: Extended version[J]. Journal of Cryptology, 2020, 33(3): 1114-1155.'
    },
    {
      id:'cmp-shahmirzadi-records-2021',label:'C12',source_reference_number:140,current_reference_numbers:[],
      text:'Shahmirzadi A R, Božilov D, Moradi A. New first-order secure AES performance records[J]. IACR Transactions on Cryptographic Hardware and Embedded Systems, 2021, 2021(2): 304-327.'
    }
  ];
  const documentAssetLocations = {
  "project-composition.png": {
    "pdf_page": 9,
    "document_page": 6,
    "item": "图 2-1"
  },
  "sbox-integrated.png": {
    "pdf_page": 10,
    "document_page": 7,
    "item": "图 2-2"
  },
  "sbox-low-area.png": {
    "pdf_page": 11,
    "document_page": 8,
    "item": "图 2-3"
  },
  "cmt-tree.png": {
    "pdf_page": 13,
    "document_page": 10,
    "item": "图 2-4"
  },
  "table-gates.png": {
    "pdf_page": 13,
    "document_page": 10,
    "item": "表 2-1"
  },
  "sbox-low-random.png": {
    "pdf_page": 18,
    "document_page": 15,
    "item": "图 2-5"
  },
  "aes-low-area.png": {
    "pdf_page": 20,
    "document_page": 17,
    "item": "图 2-6"
  },
  "aes-low-random.png": {
    "pdf_page": 20,
    "document_page": 17,
    "item": "图 2-7"
  },
  "hardware-photo.jpg": {
    "pdf_page": 21,
    "document_page": 18,
    "item": "图 2-8"
  },
  "acquisition.png": {
    "pdf_page": 23,
    "document_page": 20,
    "item": "图 2-9；图 3-7（PDF 第 34 页）"
  },
  "tvla-area-baseline.png": {
    "pdf_page": 25,
    "document_page": 22,
    "item": "图 2-11"
  },
  "tvla-area-protected.png": {
    "pdf_page": 25,
    "document_page": 22,
    "item": "图 2-12"
  },
  "tvla-random-baseline.png": {
    "pdf_page": 26,
    "document_page": 23,
    "item": "图 2-13"
  },
  "tvla-random-protected.png": {
    "pdf_page": 26,
    "document_page": 23,
    "item": "图 2-14"
  },
  "tvla-area-growth.png": {
    "pdf_page": 29,
    "document_page": 26,
    "item": "图 3-1"
  },
  "tvla-random-growth.png": {
    "pdf_page": 29,
    "document_page": 26,
    "item": "图 3-2"
  },
  "giii-functions-original.png": {
    "pdf_page": 31,
    "document_page": 28,
    "item": "图 3-3"
  },
  "giii-setup-original.png": {
    "pdf_page": 32,
    "document_page": 29,
    "item": "图 3-4"
  },
  "gii-04.png": {
    "pdf_page": 32,
    "document_page": 29,
    "item": "图 3-5"
  },
  "giii-measurement-original.png": {
    "pdf_page": 33,
    "document_page": 30,
    "item": "图 3-6"
  },
  "wave-photo-1.png": {
    "pdf_page": 24,
    "document_page": 21,
    "item": "图 2-10"
  },
  "wave-photo-2.png": {
    "pdf_page": 24,
    "document_page": 21,
    "item": "图 2-10"
  },
  "wave-photo-3.png": {
    "pdf_page": 24,
    "document_page": 21,
    "item": "图 2-10"
  },
  "wave-photo-4.png": {
    "pdf_page": 24,
    "document_page": 21,
    "item": "图 2-10"
  },
  "eq-5-2.png": {
    "item": "第 2.2.2 节"
  },
  "eq-5-3.png": {
    "item": "第 2.2.2 节"
  },
  "eq-5-4.png": {
    "item": "第 2.2.4 节"
  },
  "eq-5-5.png": {
    "item": "第 2.2.5 节"
  },
  "eq-5-6.png": {
    "item": "第 2.2.5 节"
  },
  "eq-5-7.png": {
    "item": "第 2.2.5 节"
  },
  "eq-5-8.png": {
    "item": "第 2.2.5 节"
  },
  "eq-5-9.png": {
    "item": "第 2.2.6 节"
  },
  "eq-5-10.png": {
    "item": "第 2.2.6 节"
  },
  "table-asic.png": {
    "related_document_item": "表 3-1",
    "related_document_pdf_page": 30
  },
  "table-fpga.png": {
    "related_document_item": "表 3-2",
    "related_document_pdf_page": 30
  }
};
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
      filename:'SSS小队_AES 侧信道防护对比与报告系统_作品介绍_最新版.pptx',
      slides:[26,27],
      sha256:'cada448759c0146aaa289bff2e7fbed613bd2dd703b438b22422669cb073243a'
    },
    previous_source: {
      filename:'SSS小队_AES 侧信道防护对比与报告系统_项目文档.pdf',
      pdf_page:30, document_page:27,
      sha256:'00d70653ceaac83e081aad0b9afc6d0a98a284e4eec93b4131bc8fd3745f6255'
    },
    scheme_note:'性能对照按最新作品介绍中的 ASIC 与 FPGA 表格列示；C 编号链接对应性能对比文献。',
    tables:[
      {
        id:'asic',number:'3-1',title:'ASIC 平台防护方案性能对比',source_slide:26,
        headers:['设计方案','分量','S盒面积(GE)','S盒周期','AES面积(GE)','AES周期','额外新鲜随机量(bit/周期)'],
        notes:['¹ UMC 180 nm　² NanGate 45 nm　³ 对应S盒不满足均匀性','*低随机数仍需23比特复用量与8比特guard初始化。跨工艺指标分别解释。'],
        rowReferences:[[],[],[14],[14],[],[6],[10],[10],[8],[16],[],[]],
        rowComparisonReferences:[['cmp-moradi-2011'],['cmp-bilgin-2014'],['cmp-bilgin-2015'],['cmp-bilgin-2015'],['cmp-sugawara-2019'],['cmp-gross-2016'],['cmp-shahmirzadi-2021'],['cmp-shahmirzadi-2021'],['cmp-askeland-2022'],['cmp-yao-2024'],[],[]],
        rows:[
          ['Moradi等人¹','3','—','—','11114','266','48'],
          ['Bilgin等人¹','3','—','—','9102','246','44'],
          ['Bilgin等人¹','3','—','—','11221','246','44'],
          ['Bilgin等人¹','3','2840','4','8119','246','32'],
          ['Sugawara²','3','3500','4','17100','266','0'],
          ['Gross等人²','2','—','—','7485','246','18'],
          ['Shahmirzadi等人²³','2','—','6','7619','246','1'],
          ['Shahmirzadi等人²³','2','—','6','8183','246','0'],
          ['Dhooghe等人²','2','2710','6','8130','242','0'],
          ['Yao等人²','2','—','6','7843','236','4'],
          ['低资源²','2','2111','6','6806','236','22'],
          ['低随机数²','2','2686','6','7671','236','0*']
        ]
      },
      {
        id:'fpga',number:'3-2',title:'FPGA 平台防护方案性能对比',source_slide:27,
        headers:['设计方案','slices','LUTs','FFs','BRAM(kbit)','周期','最高频率(MHz)','额外新鲜随机量(bit/周期)'],
        notes:['Spartan-6 XC6SLX75，ISE 14.7。Shahmirzadi两行按BRAM用量区分。','*0为持续额外新鲜随机量，仍需初始化与规定复用。指标采用项目性能表口径。'],
        rowReferences:[[6],[6],[],[],[],[10],[],[],[]],
        rowComparisonReferences:[['cmp-gross-2016'],['cmp-gross-2016'],['cmp-de-cnudde-2016'],['cmp-wegener-2018'],['cmp-wegener-2020'],['cmp-shahmirzadi-2021'],['cmp-shahmirzadi-records-2021'],[],[]],
        rows:[
          ['Gross (216周期)','433','894','726','0','216','110','28'],
          ['Gross (246周期)','351','792','754','0','246','134','18'],
          ['De Cnudde等人','418','905','690','0','276','133','54'],
          ['Wegener (18 bit)','254','347','124','0','6852','103','18'],
          ['Wegener (6 bit)','140','248','92','0','6852','120','6'],
          ['Shahmirzadi (0)','631','1021','866','0','246','136','0'],
          ['Shahmirzadi (108)','203','476','529','108','216','138','8'],
          ['低资源','195','524','503','0','236','145','22'],
          ['低随机数','212','561','563','0','236','125','0*']
        ]
      }
    ]
  };
  const data = {version:'1.1.1', schemaVersion:'1.1', projectDocument, conditions, variants, sources, notes, publicReference, reportPerformanceTables, referenceDocument, references, comparisonReferences, documentAssetLocations,
    resourceEnvironment: {platform:'Spartan-6 XC6SLX75',tool:'ISE Design Suite 14.7',source_id:'liu-2025-thesis',table:'5.4'},
    asicEnvironment: {platform:'NanGate 45nm',tool:'Design Compiler v2016.03',source_id:'liu-2025-thesis',table:'5.3'}
  };
  root.AESData = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
