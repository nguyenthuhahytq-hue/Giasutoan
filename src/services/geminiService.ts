import { GoogleGenAI } from "@google/genai";
import { Grade, Question, ChatMessage } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MATH_FORMAT_RULES = `
QUY TẮC TRÌNH BÀY TOÁN HỌC (PHONG CÁCH GIÁO VIÊN TIỂU HỌC VIỆT NAM):
1. TUYỆT ĐỐI KHÔNG sử dụng LaTeX hoặc định dạng mã code (code block).
2. KHÔNG sử dụng các ký hiệu: $, \\( \\), \\times, \\div.
3. Luôn viết biểu thức toán học dưới dạng văn bản bình thường.
4. Sử dụng các ký hiệu chuẩn: − (dấu trừ), × (dấu nhân), ÷ (dấu chia), ( ) (ngoặc đơn).
5. Trình bày bài giải từng bước trên các dòng riêng biệt, giống như trình bày trong vở ô ly.
   Ví dụ:
   Bài giải
   (14,3 × 4,7 + 5,3 × 14,3)
   = 14,3 × (4,7 + 5,3)
   = 14,3 × 10
   = 143
6. Lời giải thích phải ngắn gọn, đơn giản, phù hợp với học sinh tiểu học.
7. Luôn có lời động viên:
   - Nếu đúng: "Con làm rất tốt!"
   - Nếu sai: "Cô cùng xem lại bước này nhé."
`;

export const geminiService = {
  async discussPhoto(base64Image: string, grade: Grade, history: ChatMessage[], newMessage: string) {
    const chat = genAI.chats.create({
      model: "gemini-3-flash-preview",
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: `Con là một gia sư toán tiểu học AI thân thiện cho học sinh lớp ${grade}. 
        Học sinh đã tải lên một ảnh bài làm. Con hãy thảo luận về bài làm này với học sinh.
        - Xưng hô "Cô - con".
        - Luôn tham chiếu đến nội dung trong ảnh bài làm của học sinh.
        - Có thể tham chiếu đến các tin nhắn trước đó trong cuộc trò chuyện này để khen ngợi hoặc nhắc nhở con (ví dụ: "Như cô đã nói ở trên...", "Ở bước trước con đã làm rất tốt...").
        - Không đưa đáp án ngay, hãy gợi ý từng bước để con tự nghĩ.
        - Thân thiện, động viên và khuyến khích đối thoại học tập.
        - Sử dụng tiếng Việt.
        ${MATH_FORMAT_RULES}`,
      }
    });

    const response = await chat.sendMessage({
      message: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: newMessage }
      ]
    });

    return response.text;
  },
  async getProblemGuidance(problem: string, grade: Grade) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Con là một gia sư toán tiểu học AI thân thiện cho học sinh lớp ${grade}. 
      Đề bài: "${problem}". 
      Hãy hướng dẫn con từng bước giải bài toán này theo phong cách "Cô - con" và trình bày như trong vở bài tập.
      Lưu ý: Không đưa ra đáp án ngay lập tức. Hãy gợi ý để con tự suy nghĩ. 
      Sử dụng tiếng Việt, bám sát chương trình Kết nối tri thức.
      ${MATH_FORMAT_RULES}`,
    });
    const response = await model;
    return response.text;
  },

  async getHint(problem: string, grade: Grade, currentStep?: string) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Học sinh lớp ${grade} đang giải bài toán: "${problem}". 
      ${currentStep ? `Con đang ở bước: ${currentStep}.` : ""}
      Hãy đưa ra một gợi ý nhỏ hoặc đặt một câu hỏi gợi mở để giúp con tiến thêm một bước. 
      Phong cách thân thiện, xưng hô "Cô - con".
      ${MATH_FORMAT_RULES}`,
    });
    const response = await model;
    return response.text;
  },

  async gradePhoto(base64Image: string, grade: Grade) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: `Đây là ảnh bài làm toán của học sinh lớp ${grade}. 
          Hãy đóng vai một giáo viên tiểu học Việt Nam chấm bài trong vở học sinh.

          QUY TRÌNH XỬ LÝ:
          1. KIỂM TRA HƯỚNG ẢNH: Nếu ảnh bị xoay hoặc ngược, hãy tự động xoay lại trong tâm trí để đọc chính xác nội dung.
          2. KIỂM TRA ĐỘ RÕ NÉT: 
             - Nếu ảnh quá mờ, không thể đọc được: Trả lời duy nhất câu: "Cô chưa nhìn rõ bài trong ảnh. Con chụp lại gần hơn nhé."
             - Nếu ảnh hơi mờ: Cố gắng đoán đề bài từ ngữ cảnh.
          3. NHẬN DIỆN NỘI DUNG: Tập trung vào các bài toán, phép tính và lời giải của học sinh. Chuyển đổi chúng thành các biểu thức toán học dễ đọc.
          4. KIỂM TRA KẾT QUẢ: So sánh lời giải của học sinh với đáp án đúng.

          CẤU TRÚC PHẢN HỒI:
          
          🔍 Nội dung nhận diện được:
          [Liệt kê các phép tính/đề bài con đã làm trong ảnh]

          📘 Nhận xét:
          - Nhận xét bài làm đúng hay sai.
          - Lời khen hoặc lời nhắc nhở nhẹ nhàng (Xưng hô Cô - con).
          
          📗 Bài giải:
          - Nếu con làm SAI, trình bày theo định dạng:
            Bài giải
            [Phép tính đúng] = [Kết quả đúng]
            Vì:
            [Các bước tính toán chi tiết]
            Đáp số: [Kết quả đúng]
          - Nếu con làm ĐÚNG, viết lại bài giải mẫu chuẩn để con tham khảo.
          
          Lưu ý: Sử dụng tiếng Việt, thân thiện.
          ${MATH_FORMAT_RULES}`,
        },
      ],
    });
    const response = await model;
    return response.text;
  },

  async detectAndSolve(base64Image: string, grade: Grade) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: `Đây là ảnh một bài toán tiểu học lớp ${grade}. 
          Hãy đóng vai một giáo viên tiểu học Việt Nam hướng dẫn học sinh.

          QUY TRÌNH XỬ LÝ:
          1. KIỂM TRA HƯỚNG ẢNH: Tự động xử lý nếu ảnh bị xoay.
          2. KIỂM TRA ĐỘ RÕ NÉT: Nếu quá mờ, yêu cầu chụp lại: "Cô chưa nhìn rõ bài trong ảnh. Con chụp lại gần hơn nhé."
          3. NHẬN DIỆN ĐỀ BÀI: Chuyển đổi văn bản (in hoặc viết tay) thành biểu thức toán học rõ ràng.
          
          CẤU TRÚC PHẢN HỒI:
          🔍 Đề bài nhận diện được:
          [Đề bài rõ ràng]
          
          📗 Hướng dẫn giải:
          - Hướng dẫn từng bước theo phong cách "Cô - con".
          - Không đưa ra đáp án ngay lập tức. Hãy gợi ý để con tự suy nghĩ. 
          
          Lưu ý: Sử dụng tiếng Việt, bám sát chương trình GDPT 2018.
          ${MATH_FORMAT_RULES}`,
        },
      ],
    });
    const response = await model;
    return response.text;
  },

  async generateQuiz(grade: Grade, topic: string): Promise<Question[]> {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tạo 5 câu hỏi trắc nghiệm toán lớp ${grade} về chủ đề "${topic}". 
      Định dạng JSON: Array<{id: string, text: string, options: string[], correctAnswer: string, explanation: string}>.
      Các câu hỏi phải phù hợp trình độ tiểu học, ngôn ngữ dễ hiểu.
      ${MATH_FORMAT_RULES}`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  },

  async generateTest(grade: Grade, type: 'topic' | 'midterm' | 'final') {
    const numMCQ = type === 'final' ? 8 : 5;
    const numEssay = type === 'final' ? 4 : 5;
    
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tạo một đề kiểm tra ${type === 'topic' ? 'theo chủ đề' : type === 'midterm' ? 'giữa kỳ' : 'cuối kỳ'} cho học sinh lớp ${grade}.
      Đề gồm:
      - ${numMCQ} câu trắc nghiệm.
      - ${numEssay} câu tự luận.
      Định dạng JSON: { title: string, questions: Array<{id: string, text: string, options: string[], correctAnswer: string, explanation: string}>, essayQuestions: string[] }.
      ${MATH_FORMAT_RULES}`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  }
};
