import { ReadingGoal } from '../types/book';

export const READING_GOALS: ReadingGoal[] = [
  {
    id: 'skills',
    title: 'Phát triển bản thân & Kỷ luật',
    description: 'Xây dựng thói quen tốt, rèn luyện kỷ luật thép, quản lý thời gian và nâng cao hiệu suất công việc.',
    examplePrompt: 'Tôi muốn rèn luyện tính kỷ luật, vượt qua sự trì hoãn và xây dựng thói quen làm việc năng suất.',
    suggestedStyles: ['realistic'],
  },
  {
    id: 'business',
    title: 'Kinh doanh & Khởi nghiệp',
    description: 'Tư duy làm giàu, chiến lược kinh doanh, quản trị doanh nghiệp, marketing và tài chính cá nhân.',
    examplePrompt: 'Tôi muốn tìm sách về tư duy kinh doanh, quản lý tài chính và khởi nghiệp từ con số 0.',
    suggestedStyles: ['realistic'],
  },
  {
    id: 'healing',
    title: 'Tâm lý & Chữa lành cảm xúc',
    description: 'Thấu hiểu bản thân, vượt qua căng thẳng, chữa lành tổn thương và tìm lại sự bình yên nội tại.',
    examplePrompt: 'Tôi đang cảm thấy kiệt sức, mất phương hướng và cần một cuốn sách xoa dịu tâm trí, chữa lành.',
    suggestedStyles: ['subtle', 'nostalgic'],
  },
  {
    id: 'tech',
    title: 'Công nghệ & Tương lai AI',
    description: 'Khám phá thế giới trí tuệ nhân tạo, chuyển đổi số, tương lai học và các bước đột phá công nghệ.',
    examplePrompt: 'Tôi muốn tìm hiểu về Trí tuệ nhân tạo (AI) và cách công nghệ định hình lại tương lai nhân loại.',
    suggestedStyles: ['philosophical', 'realistic'],
  },
  {
    id: 'communication',
    title: 'Nghệ thuật giao tiếp & Lãnh đạo',
    description: 'Đắc nhân tâm, xây dựng mối quan hệ bền vững, kỹ năng thuyết phục và truyền cảm hứng cho người khác.',
    examplePrompt: 'Cần cuốn sách giúp tôi giao tiếp khéo léo, tự tin thuyết trình và trở thành người lãnh đạo uy tín.',
    suggestedStyles: ['realistic', 'subtle'],
  },
  {
    id: 'wisdom',
    title: 'Triết lý sống & Tư duy phản biện',
    description: 'Khai mở trí tuệ, rèn luyện tư duy logic, đặt câu hỏi phản biện và chiêm nghiệm ý nghĩa cuộc sống.',
    examplePrompt: 'Muốn tìm những cuốn sách rèn luyện tư duy phản biện sắc bén và triết lý sống an nhiên.',
    suggestedStyles: ['philosophical', 'nostalgic'],
  },
];
