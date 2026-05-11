export interface Ornament {
  value: number;
  id: string;
  kazakhName: string;
  russianName: string;
  description: string;
  meaning: string;
  region: string;
  assetPath: string;
}

export const ORNAMENTS: Ornament[] = [
  {
    value: 1,
    id: "qos-muyiz",
    kazakhName: "Қос мүйіз",
    russianName: "Парные рога",
    description: "Геральдическая лилия: вертикальный элемент и два боковых завитка, смотрящих в стороны.",
    meaning: "Символ силы, достатка и защиты семьи.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_1.svg"
  },
  {
    value: 2,
    id: "qusqanat",
    kazakhName: "Құсқанат",
    russianName: "Птичьи крылья",
    description: "Похож на птицу или бабочку: два крыла расходятся в стороны, в центре вертикальный элемент.",
    meaning: "Символ движения, свободы и уверенного пути.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_2.svg"
  },
  {
    value: 3,
    id: "gul-ornek",
    kazakhName: "Гүл өрнек",
    russianName: "Цветочный узор",
    description: "Квадратный орнамент с завитками по четырём углам и крестом в центре.",
    meaning: "Символ жизни, роста и равновесия.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_3.svg"
  },
  {
    value: 4,
    id: "tort-qulaq",
    kazakhName: "Төрт құлақ",
    russianName: "Четыре стороны",
    description: "Крестообразный знак с четырьмя лепестками по сторонам света и маленькими завитками между ними.",
    meaning: "Символ направления, устойчивости и целостного пространства.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_4.svg"
  },
  {
    value: 5,
    id: "zhebe",
    kazakhName: "Жебе",
    russianName: "Стрела",
    description: "Строгий симметричный крест с одинаковым завитком на каждом конце.",
    meaning: "Символ точности, решимости и собранной энергии.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_5.svg"
  },
  {
    value: 6,
    id: "tumarsha",
    kazakhName: "Тұмарша",
    russianName: "Амулет",
    description: "Единственный круглый орнамент в наборе: он вписан в окружность и сразу узнаётся.",
    meaning: "Символ защиты, внутреннего спокойствия и оберега.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_6.svg"
  },
  {
    value: 7,
    id: "sharshy",
    kazakhName: "Шаршы",
    russianName: "Квадрат",
    description: "Квадратный орнамент с завитками по четырём сторонам и квадратным окном в центре.",
    meaning: "Символ порядка, дома и устойчивой основы.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_7.svg"
  },
  {
    value: 8,
    id: "synar-muyiz",
    kazakhName: "Сыңар мүйіз",
    russianName: "Одинарный рог",
    description: "Компактный ромбовидный знак с четырьмя маленькими завитками.",
    meaning: "Символ лаконичной силы, достатка и личного пути.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_8.svg"
  },
  {
    value: 9,
    id: "ainalma",
    kazakhName: "Айналма",
    russianName: "Кружение",
    description: "Четыре крупных завитка направлены друг к другу и создают ощущение вращения.",
    meaning: "Символ движения, обновления и живого ритма.",
    region: "Казахстан",
    assetPath: "/ornaments/ornament_9.svg"
  }
];

export function getOrnament(value: number): Ornament | null {
  return ORNAMENTS.find((ornament) => ornament.value === value) ?? null;
}

export function canUseOrnamentMode(plan: "free" | "diamond" | "sudoku-pass"): boolean {
  return plan === "diamond" || plan === "sudoku-pass";
}
