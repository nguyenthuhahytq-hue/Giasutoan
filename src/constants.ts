import { Lesson } from "./types";

export const CURRICULUM: Record<number, Lesson[]> = {
  1: [
    { id: '1-1', title: 'Các số đến 10', grade: 1 },
    { id: '1-2', title: 'Phép cộng, phép trừ trong phạm vi 10', grade: 1 },
    { id: '1-3', title: 'Các số đến 20', grade: 1 },
    { id: '1-4', title: 'Phép cộng, phép trừ trong phạm vi 20', grade: 1 },
  ],
  2: [
    { id: '2-1', title: 'Ôn tập và bổ sung', grade: 2 },
    { id: '2-2', title: 'Phép cộng, phép trừ có nhớ trong phạm vi 100', grade: 2 },
    { id: '2-3', title: 'Bảng nhân 2, bảng nhân 5', grade: 2 },
    { id: '2-4', title: 'Bảng chia 2, bảng chia 5', grade: 2 },
  ],
  3: [
    { id: '3-1', title: 'Ôn tập và bổ sung', grade: 3 },
    { id: '3-2', title: 'Bảng nhân, bảng chia', grade: 3 },
    { id: '3-3', title: 'Làm quen với biểu thức', grade: 3 },
    { id: '3-4', title: 'Các số đến 10 000', grade: 3 },
  ],
  4: [
    { id: '4-1', title: 'Số tự nhiên', grade: 4 },
    { id: '4-2', title: 'Các phép tính với số tự nhiên', grade: 4 },
    { id: '4-3', title: 'Phân số', grade: 4 },
    { id: '4-4', title: 'Các phép tính với phân số', grade: 4 },
  ],
  5: [
    { id: '5-1', title: 'Ôn tập về phân số', grade: 5 },
    { id: '5-2', title: 'Số thập phân', grade: 5 },
    { id: '5-3', title: 'Các phép tính với số thập phân', grade: 5 },
    { id: '5-4', title: 'Hình học và Đo lường', grade: 5 },
  ],
};
