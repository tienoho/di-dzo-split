import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-initialized Gemini client safe against missing API key crashes at startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Lazy-initialized DeepSeek query executor utilizing native server-side fetch with 45s timeout protection
async function queryDeepSeek(promptText: string, jsonMode: boolean = false): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY chưa được cấu hình trên máy chủ. Vui lòng thêm khoá API trong Settings/Cài đặt.');
  }

  const endpoint = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const bodyData: any = {
    model,
    messages: [
      { role: 'user', content: promptText }
    ],
    temperature: 0.2
  };

  if (jsonMode) {
    bodyData.response_format = { type: 'json_object' };
  }

  console.log(`[DeepSeek] Gửi yêu cầu tới: ${endpoint} | Model: ${model} | JSON Mode: ${jsonMode}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[DeepSeek API Error] Status: ${response.status} | Details:`, errText);
      throw new Error(`Phản hồi lỗi từ DeepSeek API (Status ${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('Đầu ra phản hồi từ DeepSeek API rỗng.');
    }
    return content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Yêu cầu tới DeepSeek API bị quá thời gian chờ (Timeout 45s).');
    }
    throw error;
  }
}

// Fallback recommendations list for absolute stability
const fallbackRecommendations = [
  {
    name: "Lẩu Đức Trọc - Chi nhánh Tây Sơn",
    address: "Số 61 ngõ 298 Tây Sơn, Đống Đa, Hà Nội",
    rating: 4.4,
    highlights: "Quán lẩu bò, lẩu riêu cua sườn sụn cực hút khách. Không gian rộng rãi họp lớp hoặc nhậu gia đình lý tưởng.",
    priceRange: "Bình dân (~150k - 200k/người)",
    sourceUrl: "https://www.google.com/search?q=Lau+Duc+Troc+Tay+Son"
  },
  {
    name: "Bia Hơi Hải Xồm - Nguyễn Phong Sắc",
    address: "Số 86 Nguyễn Phong Sắc, Cầu Giấy, Hà Nội",
    rating: 4.2,
    highlights: "Bia tươi mát lạnh chuẩn vị Hà Nội. Các món mồi truyền thống như lạc luộc, nem chua, đậu rán lướt ván, lòng mề xào.",
    priceRange: "Bình dân (~100k - 180k/người)",
    sourceUrl: "https://www.google.com/search?q=Bia+Hoi+Hai+Xom+Nguyen+Phong+Sac"
  },
  {
    name: "Hẻm Quán - Hải Sản & Đồ Nhậu Nam Bộ",
    address: "Số 68 Hoàng Cầu, Chợ Dừa, Đống Đa, Hà Nội",
    rating: 4.5,
    highlights: "Không gian sân vườn xanh mát rượi thanh bình giữa lòng thành phố. Nổi tiếng với đồ ăn hương vị Nam Bộ: ốc len xào dừa, lẩu thái, bánh tráng trảng bàng.",
    priceRange: "Trung cấp (~200k - 350k/người)",
    sourceUrl: "https://www.google.com/search?q=Hem+Quan+Hoang+Cau"
  },
  {
    name: "Bia 2KU - Phố Tạ Hiện",
    address: "Số 67-69 Tạ Hiện, Hàng Buồm, Hoàn Kiếm, Hà Nội",
    rating: 4.3,
    highlights: "Địa điểm nhậu vỉa hè sầm uất bậc nhất Hà Thành, cực phù hợp cho giới trẻ và khách du lịch quẩy xuyên đêm.",
    priceRange: "Bình dân (~150k - 250k/người)",
    sourceUrl: "https://www.google.com/search?q=Bia+2KU+Ta+Hien"
  },
  {
    name: "Mộc Quán - Riêu & Nướng Võ Văn Tần",
    address: "Số 318 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh",
    rating: 4.6,
    highlights: "Quán nhậu mộc mạc mang phong cách tạo nhã Sài Gòn xưa. Các món riêu cua bắp bò, sườn nướng tảng thơm lừng ngon nhức nhối.",
    priceRange: "Trung cấp (~250k - 400k/người)",
    sourceUrl: "https://www.google.com/search?q=Moc+Quan+Vo+Van+Tan"
  }
];

// API endpoint to retrieve the FCM VAPID Key from server environment if available
app.get('/api/fcm-vapid', (req, res) => {
  const key = process.env.VITE_FCM_VAPID_KEY || process.env.FCM_VAPID_KEY || process.env.VAPID_KEY || process.env.FIREBASE_VAPID_KEY || null;
  res.json({
    success: true,
    key: key,
    envKeys: Object.keys(process.env).filter(k => k.toLowerCase().includes('vapid') || k.toLowerCase().includes('fcm'))
  });
});

// API endpoint for AI-powered venues recommendations with Google Search Grounding
app.post('/api/recommendations', async (req, res) => {
  try {
    const { location, category, savedVenues, provider } = req.body;

    const targetLocation = location ? location.trim() : 'Hà Nội';
    const targetCategory = category ? category.trim() : 'Bia hơi, Lẩu nướng, Quán ăn nhậu ngon';
    const isDeepSeek = provider === 'deepseek';

    // Construct the search-grounded prompt or DeepSeek prompt
    let promptText = `Hãy tìm kiếm và gợi ý các quán nhậu, quán lẩu nướng, quán bia hơi hoặc pub chill tốt nhất, có đánh giá cao tại khu vực hoặc địa điểm sau: "${targetLocation}".`;
    
    // Check if location is coordinates (lat, lng)
    const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(targetLocation);
    if (isCoords) {
      promptText += ` \n[LƯU Ý ĐẶC BIỆT]: Địa điểm này được gửi dưới dạng tọa độ GPS cụ thể (vĩ độ, kinh độ). Bạn bắt buộc phải định vị xem tọa độ này tương ứng với phường, quận, đường phố và thành phố nào tại Việt Nam (ví dụ: ở Hà Nội, TP.HCM, Đà Nẵng, v.v.), sau đó tìm kiếm các quán ăn nhậu nổi tiếng, có đánh giá cao thực sự tồn tại xung quanh khu vực tọa độ GPS này trong vòng bán kính từ 1km đến 3km.`;
    }
    
    if (targetCategory) {
      promptText += ` Tập trung cụ thể vào phong cách ẩm thực / phân loại quán: "${targetCategory}".`;
    }
    
    if (savedVenues && savedVenues.length > 0) {
      const names = savedVenues.map((v: any) => `${v.name} (đánh giá ${v.rating}⭐)`).join(', ');
      promptText += ` Khách hàng này đặc biệt thích trải nghiệm tương tự hoặc đánh giá cao như các địa điểm họ đã lưu trước đây: [${names}]. Hãy gợi ý các quán ăn nhậu có chất lượng và trải nghiệm tương thích hoặc cao hơn.`;
    }

    if (isDeepSeek) {
      promptText += `\n\nHãy gợi ý 5-7 quán nhậu có thực tế, uy tín, ĐANG HOẠT ĐỘNG tại khu vực được yêu cầu ở Việt Nam.`;
    } else {
      promptText += `\n\nBạn bắt buộc phải tìm kiếm thời gian thực qua công cụ Google Search để gợi ý 5-7 quán nhậu có thực tế, uy tín, ĐANG HOẠT ĐỘNG tại Việt Nam.`;
    }

    promptText += `
Mỗi địa điểm gợi ý yêu cầu cung cấp các thông tin cụ thể:
- Tên quán (name)
- Địa chỉ thực tế đầy đủ kèm thành phố (address)
- Rating trung bình thực tế khoảng từ 1.0 - 5.0 (rating)
- Highlights / Điểm đặc sắc (signature dish, bãi đỗ xe hoặc không gian rộng rãi) (highlights)
- Mức giá ước lượng khoảng, ví dụ: "Bình dân (~150k-250k/người)", "Trung cấp (~250k-400k/người)" hoặc "Sành điệu / Cao cấp" (priceRange)
- Đường dẫn tìm kiếm hoặc liên kết tham khảo quán đó trên Google Maps/Google Search (sourceUrl)

Định dạng kết quả trả về bắt buộc phải là một đối tượng JSON chuẩn chứa danh sách "recommendations" như sau:
{
  "recommendations": [
    {
      "name": "Tên quán ăn",
      "address": "Địa chỉ thực tế chi tiết",
      "rating": 4.5,
      "highlights": "Món mồi đặc sắc nhất là phá lấu béo ngậy, bãi đậu xe rộng rãi.",
      "priceRange": "Bình dân (~150k - 200k/người)",
      "sourceUrl": "https://www.google.com/search?q=some_search"
    }
  ]
}

Bắt buộc trả về DUY NHẤT một chuỗi JSON hợp lệ không lồng trong block markdown hay ký tự bao bọc thừa thãi nào ngoài chuỗi JSON sạch để máy chủ có thể dùng JSON.parse() trực tiếp. Chú ý dấu ngoặc kép và dấu phẩy viết đúng cú pháp JSON.`;

    try {
      let responseText = '';

      if (isDeepSeek) {
        console.log('Querying DeepSeek model for dining recommendations...');
        responseText = await queryDeepSeek(promptText, true);
      } else {
        const client = getGeminiClient();
        console.log(`Querying Gemini ${GEMINI_MODEL} with Google Search grounding for:`, targetLocation, targetCategory);
        
        const result = await client.models.generateContent({
          model: GEMINI_MODEL,
          contents: promptText,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json'
          }
        });
        responseText = result.text || '';
      }

      console.log('Received response from LLM server-side:', responseText);

      if (responseText) {
        // Safe stripping if any accidental markdown wrapper found
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();

        const data = JSON.parse(cleanText);
        if (data && Array.isArray(data.recommendations)) {
          return res.json({
            success: true,
            recommendations: data.recommendations,
            isMock: false
          });
        }
      }
      
      throw new Error('Định dạng phản hồi JSON từ AI không hợp lệ.');
    } catch (apiError: any) {
      console.error('Failure querying server-side AI API:', apiError);
      
      // Selectively filter/randomize fallbacks based on category/location matching for realistic experience
      let filtered = fallbackRecommendations;
      if (location && (location.toLowerCase().includes('hồ chí minh') || location.toLowerCase().includes('hcm') || location.toLowerCase().includes('quận 3') || location.toLowerCase().includes('sài gòn'))) {
        filtered = fallbackRecommendations.filter(v => v.address.includes('Hồ Chí Minh'));
        if (filtered.length === 0) filtered = fallbackRecommendations;
      } else if (location && location.toLowerCase().includes('hà nội')) {
        filtered = fallbackRecommendations.filter(v => v.address.includes('Hà Nội'));
      }

      const hasApiKey = isDeepSeek ? !!process.env.DEEPSEEK_API_KEY : !!process.env.GEMINI_API_KEY;
      const apiErrorMessage = apiError?.message || String(apiError);

      return res.json({
        success: true,
        recommendations: filtered,
        isMock: true,
        warning: hasApiKey
          ? `Lỗi kết nối mô hình AI (${isDeepSeek ? 'DeepSeek' : 'Gemini'}): "${apiErrorMessage}". Hệ thống tạm chuyển qua gợi ý từ kho mồi bén dự trữ.`
          : `Hệ thống đang chạy ở chế độ ngoại tuyến (Offline Backups) do máy chủ chưa được liên kết khóa API cho ${isDeepSeek ? 'DeepSeek' : 'Gemini'}.`
      });
    }
  } catch (error: any) {
    console.error('General router failure:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý yêu cầu gợi ý địa bàn nhậu ngon.'
    });
  }
});

// API endpoint for AI-powered receipt scanning (Supports standard Gemini Vision OR Hybrid DeepSeek OCR)
app.post('/api/scan-receipt', async (req, res) => {
  const { provider } = req.body;
  const isDeepSeek = provider === 'deepseek';
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy dữ liệu ảnh để quét.' });
    }

    // Extract base64 and mime-type
    let base64Data = image;
    let mimeType = 'image/jpeg';

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    if (isDeepSeek) {
      console.log('Using DeepSeek hybrid scanning: Step 1 - Extracting raw text via Gemini Vision...');
      
      const client = getGeminiClient();
      const rawExtractPrompt = `Bạn là hệ thống chuyển đổi ảnh hóa đơn sang văn bản thô (OCR).
Hãy đọc kỹ ảnh đính kèm và trích xuất TOÀN BỘ ký tự, chữ viết, con số xuất hiện trên hóa đơn một cách chi tiết nhất.
Vui lòng giữ nguyên cấu trúc dòng, các món ăn, số lượng, giá tiền, địa chỉ, số điện thoại, ngày giờ, và các con số tổng cộng để hệ thống xử lý logic tiếp theo.
TUYỆT ĐỐI không phân tích hay tóm tắt, chỉ cần trích xuất văn bản thô chân thực nhất từ biên lai/hóa đơn này.`;

      const geminiResult = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: rawExtractPrompt
            }
          ]
        }
      });

      const extractedText = geminiResult.text || '';
      console.log('Extracted raw text from Gemini OCR (length):', extractedText.length);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Gemini Vision không thể trích xuất được bất kỳ ký tự nào từ hóa đơn.');
      }

      console.log('Using DeepSeek hybrid scanning: Step 2 - Structuring and reconciling via DeepSeek...');
      const deepseekPromptText = `Bạn là chuyên gia phân tích hóa đơn nhà hàng, quán ăn, quán nhậu tại Việt Nam với độ chính xác tuyệt đối.
Dưới đây là kết quả quét văn bản thô (OCR) từ một tờ hóa đơn thanh toán:

--- BẮT ĐẦU VĂN BẢN HÓA ĐƠN ---
${extractedText}
--- KẾT THÚC VĂN BẢN HÓA ĐƠN ---

Hãy phân tích cực kỳ kỹ lưỡng văn bản thô trên để trích xuất thông tin có độ chính xác cao nhất:

1. Tên quán (venueName):
   - Hãy tìm tên thương hiệu của quán nhậu/nhà hàng (ví dụ: "Ốc Đêm 79", "Bia Hơi Hải Xồm", "Mộc Quán", v.v.).
   - KHÔNG LẤY các tên tiêu đề chung chung như: "HÓA ĐƠN BÁN LẺ", "PHIẾU THANH TOÁN", "TỔNG THANH TOÁN", "PHIẾU TÍNH TIỀN", "HOA DON", "BIÊN LAI".
   - NẾU TRÊN HÓA ĐƠN KHÔNG CÓ TÊN QUÁN HOẶC KHÔNG THỂ XÁC ĐỊNH ĐƯỢC TÊN QUÁN RÕ RÀNG, BẮT BUỘC TRẢ VỀ CHUỖI RỖNG "" CHO TRƯỜNG "venueName". TUYỆT ĐỐI KHÔNG TỰ BỊA, TỰ SUY DIỄN HOẶC BỊA ĐẶT RA TÊN QUÁN.

2. Tổng số tiền phải thanh toán (totalAmount):
   - CẢNH BÁO QUAN TRỌNG: Ở Việt Nam, dấu chấm (e.g., ".") được dùng làm dấu ngăn cách hàng nghìn. Ví dụ, "859.000" nghĩa là 859 nghìn đồng (859000 VND), hoàn toàn không phải là 859 VND hay 859 nghìn với phần lẻ thập phân. Do đó, KHÔNG ĐƯỢC trích xuất nhầm "859.000đ" hay "859.000" thành 859.
   - Tìm kiếm con số tổng cộng thực tế khách hàng phải trả (thường ghi kèm với từ "Tổng cộng", "Thanh toán", "Tổng tiền thanh toán", "Tổng cộng thanh toán", "Phải trả", "Cần thanh toán", "Total", "Thành tiền").
   - Nếu trích xuất được con số mà nhỏ hơn 10000 trong khi danh sách các món ăn có giá trị lớn (ví dụ: các món vài chục nghìn đến trăm nghìn), hãy tự động nhân bản giá trị này với 1000 cho đúng thực tế tiền tệ Việt Nam.
   - Hãy kiểm chứng lại con số này: tính tổng của tất cả các món trong hóa đơn (số lượng * đơn giá). Nếu tổng của các chi tiết món cộng lại lớn hơn nhiều so với số tiền tổng được đọc (ví dụ: tổng các món cộng lại là 859000 mà số tổng đọc được là 859), hãy lấy giá trị tổng cộng thực tế từ tổng các món cộng lại này (859000).

3. Ghi chú tóm tắt (note):
   - Hãy tóm tắt ngắn gọn các món chính nổi bật trên hóa đơn (ví dụ: "Hóa đơn tôm nhảy, ốc hương sốt trứng muối và 12 chai bia Tiger" hoặc "Set lẩu gà lá é, măng ớt và nước ngọt").

4. Danh sách các món ăn chi tiết (items):
   - Trích xuất danh sách tất cả các món ăn chính đã dùng, mỗi món gồm: "name" (tên món ăn/thức uống bằng tiếng Việt sạch sẽ), "quantity" (số lượng - number), "price" (đơn giá hoặc tổng tiền món đó - number). Hãy giữ đúng giá trị hàng nghìn dựa theo bối cảnh ẩm thực Việt Nam (vd: đơn giá "20.000" là 20000 chứ không phải 20).

Yêu cầu định dạng kết quả trả về bắt buộc phải là một đối tượng JSON chuẩn như sau:
{
  "venueName": "Tên cụ thể của quán nhậu/nhà hàng",
  "totalAmount": 859000,
  "note": "Tóm tắt các món ăn uống chính",
  "items": [
    {"name": "Tên món ăn 1", "quantity": 1, "price": 350000},
    {"name": "Bia uống", "quantity": 10, "price": 150000}
  ]
}

Bắt buộc trả về DUY NHẤT một chuỗi JSON sạch để hệ thống có thể dùng JSON.parse() trực tiếp, không chứa bất kỳ ký tự hay block markdown nào bao quanh.`;

      const deepseekResponseText = await queryDeepSeek(deepseekPromptText, true);
      console.log('DeepSeek scan response:', deepseekResponseText);

      let cleanText = deepseekResponseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsedResult = JSON.parse(cleanText);
      if (parsedResult) {
        return res.json({
          success: true,
          data: {
            venueName: parsedResult.venueName || 'Quán ngon không tên',
            totalAmount: Number(parsedResult.totalAmount) || 0,
            note: parsedResult.note || 'Hóa đơn quét bằng DeepSeek Hybrid OCR',
            items: parsedResult.items || []
          },
          isMock: false
        });
      }
      throw new Error('Định dạng JSON từ DeepSeek không hợp lệ.');
    } else {
      const promptText = `Bạn là chuyên gia phân tích hóa đơn nhà hàng, quán ăn, quán nhậu tại Việt Nam với độ chính xác tuyệt đối.
Hãy phân tích cực kỳ kỹ lưỡng ảnh biên lai/hóa đơn đính kèm để trích xuất thông tin có độ chính xác cao nhất:

1. Tên quán (venueName):
   - Hãy tìm tên thương hiệu của quán nhậu/nhà hàng (thường nằm ở dòng chữ to, đậm nhất ở đầu hóa đơn ví dụ: "Ốc Đêm 79", "Bia Hơi Hải Xồm", "Nhà hàng Sen Tây Hồ", "Lẩu Dê Đồng Hương", "Thu Ngân Ốc Hải Tây").
   - KHÔNG LẤY các tên tiêu đề chung chung như: "HÓA ĐƠN BÁN LẺ", "PHIẾU THANH TOÁN", "TỔNG THANH TOÁN", "PHIẾU TÍNH TIỀN", "HOA DON", "BIÊN LAI".
   - NẾU TRÊN HÓA ĐƠN KHÔNG CÓ TÊN QUÁN HOẶC KHÔNG THỂ XÁC ĐỊNH ĐƯỢC TÊN QUÁN RÕ RÀNG, BẮT BUỘC TRẢ VỀ CHUỖI RỖNG "" CHO TRƯỜNG "venueName". TUYỆT ĐỐI KHÔNG TỰ BỊA, TỰ SUY DIỄN HOẶC BỊA ĐẶT RA TÊN QUÁN.

2. Tổng số tiền phải thanh toán (totalAmount):
   - CẢNH BÁO QUAN TRỌNG: Ở Việt Nam, dấu chấm (e.g., ".") được dùng làm dấu ngăn cách hàng nghìn. Ví dụ, "859.000" nghĩa là 859 nghìn đồng (859000 VND), hoàn toàn không phải là 859 VND hay 859 nghìn với phần lẻ thập phân. Do đó, KHÔNG ĐƯỢC trích xuất nhầm "859.000đ" hay "859.000" thành 859.
   - Tìm kiếm con số tổng cộng thực tế khách hàng phải trả (thường ghi kèm với từ "Tổng cộng", "Thanh toán", "Tổng tiền thanh toán", "Tổng cộng thanh toán", "Phải trả", "Cần thanh toán", "Total", "Thành tiền", "Tổng cộng thanh toán / bốc nợ").
   - Nếu trích xuất được con số mà nhỏ hơn 10000 trong khi danh sách các món ăn có giá trị lớn (ví dụ: các món vài chục nghìn đến trăm nghìn), hãy tự động nhân bản giá trị này với 1000 cho đúng thực tế tiền tệ Việt Nam.
   - Hãy kiểm chứng lại con số này: tính tổng của tất cả các món trong hóa đơn (số lượng * đơn giá). Nếu tổng của các chi tiết món cộng lại lớn hơn nhiều so với số tiền tổng được đọc (ví dụ: tổng các món cộng lại là 859000 mà số tổng đọc được là 859), hãy lấy giá trị tổng cộng thực tế từ tổng các món cộng lại này (859000).

3. Ghi chú tóm tắt (note):
   - Hãy tóm tắt ngắn gọn các món chính nổi bật trên hóa đơn (ví dụ: "Hóa đơn tôm nhảy, ốc hương sốt trứng muối và 12 chai bia Tiger" hoặc "Set lẩu gà lá é, măng ớt và nước ngọt").

4. Danh sách các món ăn chi tiết (items):
   - Trích xuất danh sách tất cả các món ăn chính đã dùng, mỗi món gồm: "name" (tên món ăn/thức uống bằng tiếng Việt sạch sẽ), "quantity" (số lượng - number), "price" (đơn giá hoặc tổng tiền món đó - number). Hãy giữ đúng giá trị hàng nghìn dựa theo bối cảnh ẩm thực Việt Nam (vd: đơn giá "20.000" là 20000 chứ không phải 20).

Yêu cầu định dạng kết quả trả về bắt buộc phải là một đối tượng JSON chuẩn như sau:
{
  "venueName": "Tên cụ thể của quán nhậu/nhà hàng",
  "totalAmount": 859000,
  "note": "Tóm tắt các món ăn uống chính",
  "items": [
    {"name": "Tên món ăn 1", "quantity": 1, "price": 350000},
    {"name": "Bia uống", "quantity": 10, "price": 150000}
  ]
}

Bắt buộc trả về DUY NHẤT một chuỗi JSON sạch để hệ thống có thể dùng JSON.parse() trực tiếp, không chứa ký tự bao bọc thừa thãi ngoài chuỗi JSON sạch.`;

      const client = getGeminiClient();
      console.log(`Sending receipt image to Gemini ${GEMINI_MODEL} for OCR scanning...`);
      
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: promptText
            }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text;
      console.log('OCR Gemini response:', responseText);

      if (responseText) {
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();

        const parsedResult = JSON.parse(cleanText);
        if (parsedResult) {
          return res.json({
            success: true,
            data: {
              venueName: parsedResult.venueName || 'Quán ngon không tên',
              totalAmount: Number(parsedResult.totalAmount) || 0,
              note: parsedResult.note || 'Hóa đơn quét bằng AI Vision',
              items: parsedResult.items || []
            },
            isMock: false
          });
        }
      }
      throw new Error('Sai định dạng phản hồi JSON của Gemini Vision.');
    }
  } catch (apiError: any) {
    console.log('OCR processing failed, calling fallback mockup/offline sandbox engine:', apiError?.message);
    const sampleNames = ['Lẩu nướng ngói tươi 79', 'Bia hơi Hải Xồm', 'Hẻm Ốc Sài thành', 'Lẩu bò súng sính Đống Đa'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomTotal = Math.floor(Math.random() * 4 + 2) * 250000 + 45000;

    return res.json({
      success: true,
      data: {
        venueName: randomName,
        totalAmount: randomTotal,
        note: `Hóa đơn quét giả lập (Gặp sự cố kết nối: ${apiError?.message || 'Thiếu API Key'})`,
        items: [
          { name: 'Nồi lẩu bò thập cẩm lớn', quantity: 1, price: 380000 },
          { name: 'Đĩa bò nướng bản gang', quantity: 1, price: 180000 },
          { name: 'Vỉ bia sảng khoái', quantity: 12, price: 180000 }
        ]
      },
      isMock: true,
      warning: `LƯU Ý: Không thể kết nối AI (${isDeepSeek ? 'DeepSeek' : 'Gemini'}). Hệ thống đã dùng giả lập hóa đơn ngoại tuyến.`
    });
  }
});

// API endpoint for AI-powered budget prediction and dining optimization tips
app.post('/api/predict-budget', async (req, res) => {
  const { bills, provider } = req.body;
  const isDeepSeek = provider === 'deepseek';

  if (!bills || !Array.isArray(bills) || bills.length === 0) {
    return res.json({
      success: true,
      data: {
        summary: {
          frequencyAnalysis: "Bạn chưa ghi nhận cuộc nhậu nào trên hệ thống. Hãy gầy độ cuộc đầu tiên để AI phân tích chính xác thói quen chi tiêu của bạn!",
          averageBill: 0,
          totalSpent: 0
        },
        prediction: {
          expectedSessions: 1,
          suggestedBudget: 500000,
          savingBudget: 350000,
          explanation: "Dựa trên dữ liệu tiêu chuẩn của cộng đồng dân nhậu Việt Nam, ngân sách trung bình cho một buổi tụ họp vui vẻ khoảng 350.000đ - 500.000đ/người. Đây là mức ngân sách hợp lý để có một nồi lẩu ấm cúng cùng vài lon bia mát lạnh."
        },
        tips: [
          "Lên thực đơn sẵn và chọn các combo lẩu/nướng để tối ưu hóa giá tiền thay vì gọi lẻ.",
          "Chủ động đem theo nước ngọt hoặc nước suối nếu nhà hàng tính phí đồ uống đi kèm quá đắt đỏ.",
          "Sử dụng công cụ Dzô! Split để chia tiền sòng phẳng ngay sau khi cuộc nhậu kết thúc, tránh tình trạng 'quên' trả nợ gây khó xử."
        ],
        styleRecommendation: "Nên chọn các quán ăn gia đình, quán nướng ngói bình dân hoặc các quán bia hơi vỉa hè để vừa ngon vừa tiết kiệm túi tiền."
      },
      isMock: true,
      warning: 'Hãy thêm một vài hóa đơn để AI có dữ liệu phân tích chuẩn xác nhất.'
    });
  }

  // Rút gọn thông tin hóa đơn để tiết kiệm token gửi cho LLM
  const simplifiedBills = bills.slice(0, 15).map(b => ({
    venueName: b.venueName,
    date: b.date,
    totalAmount: b.totalAmount,
    memberCount: b.members?.length || 0,
    note: b.note || ""
  }));

  const promptText = `Bạn là một chuyên gia tài chính nhậu nhẹt và phân tích hành vi tiêu dùng thông minh nhất Việt Nam.
Hãy phân tích dữ liệu lịch sử các cuộc nhậu của người dùng dưới đây để dự báo hành vi và tính toán ngân sách đề xuất cho TUẦN TỚI (đặc biệt tập trung vào các ngày cuối tuần Thứ Sáu, Thứ Bảy, Chủ Nhật):

--- DANH SÁCH LỊCH SỬ CUỘC NHẬU GẦN ĐÂY ---
${JSON.stringify(simplifiedBills, null, 2)}
--- KẾT THÚC DANH SÁCH ---

Vui lòng thực hiện các phân tích và tính toán sau:
1. Thói quen chi tiêu: Tần suất nhậu (khoảng bao nhiêu lần một tuần/tháng), mức chi tiêu trung bình mỗi cuộc nhậu, tổng chi tiêu.
2. Dự kiến số cuộc nhậu sẽ phát sinh vào cuối tuần tới và ngân sách đề xuất:
   - expectedSessions: Số cuộc nhậu có khả năng phát sinh (thường từ 1-3 tùy thuộc tần suất cũ).
   - suggestedBudget: Ngân sách tổng đề xuất mức an toàn (VND, số nguyên) để họ nhậu thoải mái theo thói quen cũ nhưng không vung tay quá trán.
   - savingBudget: Ngân sách tổng đề xuất mức tiết kiệm tối ưu (VND, số nguyên) khi họ muốn siết chặt hầu bao.
   - explanation: Giải thích cụ thể và logic tại sao đưa ra các con số ngân sách này (tham chiếu trực tiếp từ mức trung bình của họ, tần suất nhậu và số lượng người cùng nhậu trung bình).
3. Đưa ra 3 lời khuyên thực tế, hài hước, mang đậm phong cách văn hóa nhậu Việt Nam nhưng cực kỳ sắc sảo để giúp họ tối ưu hóa chi tiêu mà vẫn vui vẻ hết nấc.
4. Đưa ra gợi ý phong cách quán ăn hoặc phân khúc món ăn phù hợp với túi tiền đề xuất của tuần tới (ví dụ: khuyên đi bia hơi, ốc vỉa hè nếu ngân sách thấp, hoặc buffet nướng lẩu, pub chill nếu ngân sách dư dả).

YÊU CẦU ĐỊNH DẠNG: Bạn bắt buộc phải trả về DUY NHẤT một chuỗi JSON hợp lệ không lồng trong block markdown hay ký tự bao bọc thừa thãi nào ngoài chuỗi JSON sạch để máy chủ có thể dùng JSON.parse() trực tiếp. Chú ý dấu ngoặc kép và dấu phẩy viết đúng cú pháp JSON.

Định dạng JSON mẫu bắt buộc tuân theo:
{
  "summary": {
    "frequencyAnalysis": "Phân tích cụ thể tần suất và thói quen nhậu của họ (ví dụ: 'Bạn thường nhậu khoảng 1.5 lần/tuần, tập trung chủ yếu tại các quán nướng lẩu...')",
    "averageBill": 450000,
    "totalSpent": 1850000
  },
  "prediction": {
    "expectedSessions": 2,
    "suggestedBudget": 800000,
    "savingBudget": 550000,
    "explanation": "Lời giải thích logic và chặt chẽ bằng tiếng Việt..."
  },
  "tips": [
    "Mẹo 1...",
    "Mẹo 2...",
    "Mẹo 3..."
  ],
  "styleRecommendation": "Mô tả phong cách quán ăn/ẩm thực được khuyên dùng dựa trên ngân sách tuần tới..."
}`;

  try {
    let responseText = '';
    if (isDeepSeek) {
      console.log('[Predict] Querying DeepSeek for budget prediction...');
      responseText = await queryDeepSeek(promptText, true);
    } else {
      console.log('[Predict] Querying Gemini for budget prediction...');
      const client = getGeminiClient();
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText,
        config: {
          responseMimeType: 'application/json'
        }
      });
      responseText = result.text || '';
    }

    console.log('[Predict] Received response length:', responseText.length);

    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    const parsedData = JSON.parse(cleanText);
    return res.json({
      success: true,
      data: parsedData,
      isMock: false
    });

  } catch (apiError: any) {
    console.error('Failure querying AI API for budget prediction:', apiError);

    // Tính toán thống kê thô bằng thuật toán thuần túy để làm dự phòng hoàn hảo nếu hỏng mạng/API key
    const totalSpent = bills.reduce((sum: number, b: any) => sum + b.totalAmount, 0);
    const averageBill = Math.round(totalSpent / bills.length);
    const expectedSessions = bills.length > 5 ? 2 : 1;
    const suggestedBudget = averageBill * expectedSessions;
    const savingBudget = Math.round(suggestedBudget * 0.75);

    return res.json({
      success: true,
      data: {
        summary: {
          frequencyAnalysis: `Dựa trên thống kê nội bộ từ ${bills.length} cuộc nhậu đã ghi nhận, bạn thường xuyên có những buổi liên hoan vui vẻ cùng bạn bè với tần suất tương đối ổn định.`,
          averageBill,
          totalSpent
        },
        prediction: {
          expectedSessions,
          suggestedBudget,
          savingBudget,
          explanation: `Tính toán dự phòng dựa trên dữ liệu lịch sử chi tiêu trung bình của bạn (${averageBill.toLocaleString('vi-VN')}đ/cuộc nhậu). Dự báo tuần tới bạn có thể phát sinh khoảng ${expectedSessions} cuộc gặp gỡ, do đó chúng tôi đề xuất ngân sách thoải mái là ${suggestedBudget.toLocaleString('vi-VN')}đ và ngân sách thắt lưng buộc bụng là ${savingBudget.toLocaleString('vi-VN')}đ.`
        },
        tips: [
          "Chủ động chọn quán bia hơi truyền thống hoặc lẩu gia đình để nhận mức giá hữu nghị hơn các nhà hàng sang trọng.",
          "Áp dụng quy tắc 'Dzô! Split' chia đều sòng phẳng ngay tại bàn tiệc để tránh gánh nợ phát sinh.",
          "Cân nhắc giới hạn số lượng bia gọi sẵn, uống đến đâu gọi đến đó để tránh lãng phí những lon bia khui dở."
        ],
        styleRecommendation: averageBill > 600000 
          ? "Với mức chi tiêu dư dả này, bạn có thể lựa chọn các quán nướng lẩu buffet hiện đại hoặc một vài pub chill nhẹ nhàng cho cuối tuần ấm cúng."
          : "Nên ưu tiên các quán lẩu vỉa hè bình dân, ốc đêm hoặc quán bia hơi sân vườn để giữ vững ngân sách an toàn."
      },
      isMock: true,
      warning: `Không thể kết nối dịch vụ AI (${isDeepSeek ? 'DeepSeek' : 'Gemini'}). Hệ thống đã tính toán dự toán bằng bộ phân tích thống kê toán học dự phòng.`
    });
  }
});

// ==========================================
// FCM PUSH NOTIFICATIONS SERVER IMPLEMENTATION
// ==========================================

let fcmInitialized = false;

function initFirebaseAdmin(): boolean {
  if (fcmInitialized) return true;
  if ((admin as any).apps?.length > 0) {
    fcmInitialized = true;
    return true;
  }
  try {
    admin.initializeApp();
    fcmInitialized = true;
    console.log('[FCM Admin] Initialized with Default Application Credentials.');
    return true;
  } catch (err: any) {
    console.warn('[FCM Admin] Google Application Default Credentials not available directly, attempting local config fallback.');
    try {
      // First check environment variables
      const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
      if (envProjectId) {
        admin.initializeApp({
          projectId: envProjectId
        });
        fcmInitialized = true;
        console.log('[FCM Admin] Initialized successfully with FIREBASE_PROJECT_ID env variable.');
        return true;
      }
      
      // Fallback to local config file
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const cfg = JSON.parse(configRaw);
        admin.initializeApp({
          projectId: cfg.projectId
        });
        fcmInitialized = true;
        console.log('[FCM Admin] Initialized successfully with firebase-applet-config.json projectId.');
        return true;
      }
    } catch (innerErr) {
      console.error('[FCM Admin ERROR] Failed to initialize Firebase Admin SDK:', innerErr);
    }
  }
  return false;
}

// Serve firebase-messaging-sw.js dynamically with target config values
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  
  let configVal = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ""
  };
  
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      configVal.apiKey = configVal.apiKey || fileConfig.apiKey;
      configVal.authDomain = configVal.authDomain || fileConfig.authDomain;
      configVal.projectId = configVal.projectId || fileConfig.projectId;
      configVal.storageBucket = configVal.storageBucket || fileConfig.storageBucket;
      configVal.messagingSenderId = configVal.messagingSenderId || fileConfig.messagingSenderId;
      configVal.appId = configVal.appId || fileConfig.appId;
    }
  } catch (e) {
    console.error('Error reading config for Service Worker:', e);
  }

  res.send(`
    importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

    firebase.initializeApp({
      apiKey: "${configVal.apiKey}",
      authDomain: "${configVal.authDomain}",
      projectId: "${configVal.projectId}",
      storageBucket: "${configVal.storageBucket}",
      messagingSenderId: "${configVal.messagingSenderId}",
      appId: "${configVal.appId}"
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background message received:', payload);
      const title = payload.notification?.title || 'Chia Tiền Nhậu';
      const options = {
        body: payload.notification?.body || 'Bạn có một tin nhắc nợ nần cần thanh toán.',
        icon: payload.notification?.icon || 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png',
        tag: payload.data?.tag,
        data: payload.data
      };
      self.registration.showNotification(title, options);
    });
  `);
});

// Endpoint to dispatch FCM push notification
app.post('/api/send-fcm', async (req, res) => {
  try {
    const { tokens, title, body, icon, data } = req.body;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách tokens không hợp lệ.' });
    }

    const cleanTokens = tokens.filter(t => typeof t === 'string' && t.trim() !== '');
    if (cleanTokens.length === 0) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy token dạng chuỗi hợp lệ.' });
    }

    const isReady = initFirebaseAdmin();
    if (!isReady) {
      console.log('[FCM Backend Fallback] FCM is not active. Message logged:', { title, body, cleanTokens });
      return res.json({
        success: true,
        isSimulated: true,
        message: 'Ứng dụng đang giả lập FCM Push (Chế độ Sandbox). Gửi thông báo hoàn thành.',
        results: cleanTokens.map(t => ({ token: t, success: true }))
      });
    }

    const payload = {
      notification: {
        title: title || 'Chia Tiền Nhậu 🍻',
        body: body || 'Có nhắc nhở mới liên quan đến cuộc nhậu của bạn!'
      },
      data: data || {},
      tokens: cleanTokens
    };

    console.log(`[FCM Backend] Dispatching Multicast Notification to ${cleanTokens.length} devices...`);
    try {
      const result = await (admin as any).messaging().sendEachForMulticast(payload);
      console.log(`[FCM Backend] Success: ${result.successCount}, Fail: ${result.failureCount}`);

      const responsesParsed = result.responses.map((resp, i) => ({
        token: cleanTokens[i],
        success: resp.success,
        error: resp.error ? resp.error.message : null
      }));

      return res.json({
        success: true,
        isSimulated: false,
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: responsesParsed
      });
    } catch (sendErr: any) {
      console.warn('[FCM Backend] Real FCM dispatch failed (missing server-side credentials/private keys). Falling back to simulated successful delivery.', sendErr.message || sendErr);
      return res.json({
        success: true,
        isSimulated: true,
        message: `Đã giả lập thông báo thành công. (Gặp lỗi khi gửi FCM thực tế: ${sendErr.message || 'Lỗi xác thực/Quyền hạn'})`,
        results: cleanTokens.map(t => ({ token: t, success: true }))
      });
    }

  } catch (err: any) {
    console.error('FCM Core error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Lỗi truyền tải Firebase Cloud Messaging.'
    });
  }
});

// Configure serving layers
async function setupServer() {
  // Bỏ qua khởi động server offline nếu đang chạy trên Vercel dưới dạng Serverless Function
  if (process.env.VERCEL) {
    console.log('[Splitting] Vercel environment detected. Serverless handling.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dzô! Split Server] running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();

export default app;
