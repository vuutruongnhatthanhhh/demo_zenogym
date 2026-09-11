// One-off script: build data/products.json (50 sample gym machines) using the
// images downloaded by fetch-images.mjs.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const manifestPath = path.resolve("scripts/image-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));

function imagesFor(slug) {
  const list = manifest[slug];
  if (!list || list.length === 0) return ["/images/placeholder-equipment.svg"];
  return list;
}

function pick(slug, index) {
  const list = imagesFor(slug);
  return list[index % list.length];
}

const CARDIO = "Thiết bị cardio khác";
const RACK = "Giàn tạ & máy tập toàn thân";
const SINGLE = "Máy tập cơ đơn lẻ";
const FREE = "Dụng cụ tập tạ tự do";
const ACC = "Phụ kiện tập luyện";

// [namePrefix, imageSlug, category, cost, retail, project, description]
const specs = [
  // Máy chạy bộ (6)
  ["Máy chạy bộ ZenoPro T5", "treadmill", "Máy chạy bộ", 18000000, 28500000, 24000000, "Động cơ 3.0HP, tốc độ tối đa 18km/h, khung gấp gọn tiết kiệm diện tích."],
  ["Máy chạy bộ ZenoPro T7", "treadmill", "Máy chạy bộ", 22000000, 34500000, 29500000, "Động cơ 4.0HP, mặt chạy rộng 55cm, giảm chấn 3 vùng cho phòng gym thương mại."],
  ["Máy chạy bộ IronMax RT9", "treadmill", "Máy chạy bộ", 27000000, 42000000, 36000000, "Động cơ AC 5.0HP chuyên dụng thương mại, độ dốc điện tử 0-15%."],
  ["Máy chạy bộ TitanFit Runner X", "treadmill", "Máy chạy bộ", 32000000, 49500000, 42500000, "Màn hình cảm ứng 15 inch, kết nối app theo dõi sức khỏe, chịu tải 180kg."],
  ["Máy chạy bộ FitCore Home 3", "treadmill", "Máy chạy bộ", 12500000, 19800000, 16800000, "Dòng phổ thông cho phòng gym mini, gấp gọn, phù hợp không gian nhỏ."],
  ["Máy chạy bộ ProSteel Commercial 8", "treadmill", "Máy chạy bộ", 35000000, 55000000, 47000000, "Chuẩn thương mại cường độ cao, băng tải kép, bảo hành motor 5 năm."],

  // Xe đạp tập (5)
  ["Xe đạp tập ZenoPro Spin S3", "exercise-bike", "Xe đạp tập", 6500000, 10500000, 8800000, "Bánh đà 18kg, kháng lực ma sát, chuẩn phòng tập spinning."],
  ["Xe đạp tập FitCore Air Bike", "exercise-bike", "Xe đạp tập", 5200000, 8600000, 7200000, "Kháng lực gió kết hợp tay đẩy, phù hợp bài tập HIIT toàn thân."],
  ["Xe đạp tập nằm ProSteel R-Comfort", "exercise-bike", "Xe đạp tập", 7800000, 12500000, 10500000, "Thiết kế tựa lưng, phù hợp phục hồi chức năng và người lớn tuổi."],
  ["Xe đạp tập đứng TitanFit Upright U2", "exercise-bike", "Xe đạp tập", 6900000, 11200000, 9500000, "Màn hình LCD hiển thị nhịp tim, 16 cấp kháng lực điện từ."],
  ["Xe đạp tập ZenoElite Studio Pro", "exercise-bike", "Xe đạp tập", 9500000, 15200000, 13000000, "Khung thép chịu lực cao, chuyên dùng cho lớp học nhóm cường độ cao."],

  // Thiết bị cardio khác (7)
  ["Máy tập elliptical ZenoPro E4", "elliptical", CARDIO, 15500000, 24500000, 20800000, "Sải chân 50cm, chuyển động êm ái, giảm áp lực lên khớp gối."],
  ["Máy tập elliptical IronMax E8", "elliptical", CARDIO, 21000000, 33000000, 28000000, "Bánh đà 22kg, 20 cấp kháng lực, chuẩn phòng gym thương mại."],
  ["Máy chèo thuyền ZenoPro Row R2", "rowing-machine", CARDIO, 9800000, 15800000, 13400000, "Kháng lực khí động + từ tính, gấp gọn, màn hình theo dõi hiệu suất."],
  ["Máy chèo thuyền TitanFit Row Pro", "rowing-machine", CARDIO, 13500000, 21500000, 18200000, "Ray trượt dài chuẩn thi đấu, khung nhôm nhẹ, tải trọng 150kg."],
  ["Máy leo cầu thang ProSteel StepMill", "stair-climber", CARDIO, 28000000, 43000000, 37000000, "Mô phỏng leo cầu thang liên tục, phù hợp phòng gym chuyên nghiệp."],
  ["Máy rung toàn thân ZenoElite Vibro", "vibration-plate", CARDIO, 6800000, 11000000, 9200000, "Hỗ trợ giảm mỡ, tăng tuần hoàn máu, 3 chế độ rung tự động."],
  ["Máy tập elliptical FitCore E2 Compact", "elliptical", CARDIO, 11200000, 17800000, 15000000, "Thiết kế nhỏ gọn cho phòng gym mini và sử dụng gia đình."],

  // Giàn tạ & máy tập toàn thân (8)
  ["Giàn tạ đa năng ZenoPro Rack PR3", "power-rack", RACK, 14500000, 22800000, 19500000, "Khung thép chịu lực 300kg, kèm móc treo tạ đòn và thanh xà đơn."],
  ["Giàn tạ đa năng IronMax Power Cage", "power-rack", RACK, 19800000, 31000000, 26500000, "Cấu trúc khung vuông chắc chắn, tích hợp ròng rọc kéo cáp."],
  ["Giàn tạ đa năng TitanFit Half Rack", "power-rack", RACK, 12000000, 19000000, 16200000, "Thiết kế nửa giàn tiết kiệm diện tích, phù hợp phòng gym vừa và nhỏ."],
  ["Máy Smith ZenoElite Smith Machine", "smith-machine", RACK, 26000000, 41000000, 35000000, "Thanh trượt tuyến tính êm ái, tích hợp counterbalance an toàn."],
  ["Máy Smith ProSteel Smith Combo", "smith-machine", RACK, 31000000, 48500000, 41500000, "Kết hợp Smith machine và giàn tạ đơn, tối ưu không gian tập luyện."],
  ["Máy cáp đa năng ZenoPro Cable Cross", "cable-crossover", RACK, 33000000, 52000000, 44500000, "Hai trụ cáp độc lập, hơn 20 bài tập cho toàn thân."],
  ["Máy tập toàn thân IronMax Functional Trainer", "cable-crossover", RACK, 38000000, 59000000, 50500000, "Ròng rọc điều chỉnh độ cao linh hoạt, phù hợp tập nhóm nhỏ."],
  ["Máy tập đa năng TitanFit Home Gym Station", "multi-gym", RACK, 16500000, 26000000, 22000000, "Tích hợp nhiều bài tập trên một khung máy, tiết kiệm chi phí đầu tư."],

  // Máy tập cơ đơn lẻ (10)
  ["Máy tập ngực ZenoPro Chest Press", "chest-press", SINGLE, 13800000, 21800000, 18500000, "Cơ chế đòn bẩy kép, chuyển động tự nhiên theo giải phẫu cơ ngực."],
  ["Máy tập ngực IronMax Chest Press Plus", "chest-press", SINGLE, 15200000, 24000000, 20500000, "Ghế điều chỉnh 4 vị trí, phù hợp nhiều thể trạng người tập."],
  ["Máy tập vai ZenoPro Shoulder Press", "shoulder-press", SINGLE, 12500000, 19800000, 16800000, "Tăng cường cơ vai an toàn, tay cầm xoay đa hướng."],
  ["Máy tập vai TitanFit Shoulder Press Pro", "shoulder-press", SINGLE, 14800000, 23500000, 20000000, "Biên độ chuyển động rộng, đệm lưng êm ái chống chấn thương."],
  ["Máy kéo xô ZenoPro Lat Pulldown", "lat-pulldown", SINGLE, 13200000, 20800000, 17700000, "Thanh kéo đa dạng vị trí nắm, tập trung nhóm cơ lưng xô."],
  ["Máy đạp đùi ZenoPro Leg Press", "leg-press", SINGLE, 21500000, 34000000, 29000000, "Góc nghiêng 45 độ, chịu tải tạ lớn cho bài tập đùi chuyên sâu."],
  ["Máy đạp đùi IronMax Leg Press Heavy", "leg-press", SINGLE, 26000000, 41000000, 35000000, "Khung thép gia cường, phù hợp phòng gym thương mại tải trọng cao."],
  ["Máy đùi trước ZenoPro Leg Extension", "leg-extension", SINGLE, 11800000, 18600000, 15800000, "Cô lập cơ đùi trước hiệu quả, đệm ống chân êm ái."],
  ["Máy đùi trước & sau IronMax Leg Ext/Curl", "leg-extension", SINGLE, 15500000, 24500000, 20800000, "Kết hợp 2 bài tập đùi trước và đùi sau trên cùng một máy."],
  ["Máy tập bụng ZenoPro Ab Crunch", "leg-extension", SINGLE, 10800000, 17200000, 14600000, "Chuyển động xoay theo cột sống, tập trung nhóm cơ bụng an toàn."],

  // Dụng cụ tập tạ tự do (9)
  ["Bộ tạ đơn ZenoPro Dumbbell Set", "dumbbells", FREE, 8500000, 13500000, 11500000, "Bộ tạ đơn cao su bọc từ 2-24kg, kèm giá để tạ 3 tầng."],
  ["Bộ tạ đơn điều chỉnh IronMax Adjustable", "dumbbells", FREE, 4200000, 6800000, 5700000, "Tạ đơn điều chỉnh nhanh 2.5-24kg, tiết kiệm không gian lưu trữ."],
  ["Bộ tạ đơn lục giác TitanFit Hex Set", "dumbbells", FREE, 9800000, 15600000, 13200000, "Thiết kế lục giác chống lăn, tay cầm chống trượt cao cấp."],
  ["Tạ ấm ZenoPro Kettlebell 16kg", "kettlebell", FREE, 950000, 1500000, 1250000, "Thân gang liền khối, tay cầm rộng phù hợp bài tập swing, snatch."],
  ["Bộ tạ ấm IronMax Kettlebell Set 3 mức", "kettlebell", FREE, 2600000, 4200000, 3500000, "Combo 3 mức tạ 8-12-16kg cho lộ trình tập tăng dần."],
  ["Thanh đòn tạ ZenoPro Olympic Bar 20kg", "barbell", FREE, 2800000, 4500000, 3800000, "Thanh đòn chuẩn Olympic dài 2.2m, chịu tải 300kg."],
  ["Bộ tạ đòn & bánh tạ IronMax Plate Set 100kg", "barbell", FREE, 11500000, 18200000, 15500000, "Bộ bánh tạ cao su bọc chống ồn kèm thanh đòn, tổng tải 100kg."],
  ["Ghế tập tạ ZenoPro Adjustable Bench", "weight-bench", FREE, 3200000, 5100000, 4300000, "Điều chỉnh độ nghiêng 7 cấp, khung thép chịu lực 250kg."],
  ["Ghế tập tạ TitanFit Flat Bench Pro", "weight-bench", FREE, 4100000, 6500000, 5500000, "Đệm mút dày cao cấp, chân đế chống trượt, dùng cho tập ngực và vai."],

  // Phụ kiện tập luyện (5)
  ["Bục nhảy Plyo Box ZenoPro 3 tầng", "plyo-box", ACC, 1800000, 2900000, 2450000, "Ba độ cao 30-45-60cm trong một khối, khung gỗ công nghiệp chắc chắn."],
  ["Dây kháng lực Battle Rope ZenoPro 12m", "battle-rope", ACC, 1500000, 2400000, 2050000, "Đường kính 5cm, bọc PE chống mài mòn, phù hợp bài tập cardio sức mạnh."],
  ["Bóng tập gym ZenoPro Medicine Ball 6kg", "medicine-ball", ACC, 650000, 1050000, 880000, "Vỏ cao su chống trượt, dùng cho bài tập ném và xoay người."],
  ["Thảm tập gym ZenoPro Yoga Mat", "yoga-mat", ACC, 280000, 450000, 380000, "Chất liệu TPE chống trượt, dày 8mm êm ái cho bài tập sàn."],
  ["Dây treo tập TRX ZenoPro Suspension Trainer", "trx", ACC, 950000, 1550000, 1300000, "Bộ dây treo đa năng tập toàn thân, dễ dàng lắp đặt tại nhà hoặc phòng gym."],
];

const KNOWN_BRANDS = ["ZenoPro", "ZenoElite", "IronMax", "TitanFit", "ProSteel", "FitCore"];

function extractBrand(name) {
  return KNOWN_BRANDS.find((brand) => name.includes(brand)) ?? "ZenoGym";
}

const slugCounters = {};
function nextIndexFor(slug) {
  const current = slugCounters[slug] ?? 0;
  slugCounters[slug] = current + 1;
  return current;
}

const products = specs.map((s, idx) => {
  const [name, slug, category, costPrice, retailPrice, projectPrice, description] = s;
  const now = new Date(Date.now() - (specs.length - idx) * 60000).toISOString();
  return {
    id: randomUUID(),
    name,
    brand: extractBrand(name),
    category,
    image: pick(slug, nextIndexFor(slug)),
    costPrice,
    retailPrice,
    projectPrice,
    description,
    available: true,
    createdAt: now,
    updatedAt: now,
  };
});

await fs.mkdir(path.resolve("data"), { recursive: true });
await fs.writeFile(
  path.resolve("data/products.json"),
  JSON.stringify(products, null, 2)
);
await fs.writeFile(path.resolve("data/quotes.json"), "[]");

console.log(`Seeded ${products.length} products.`);
