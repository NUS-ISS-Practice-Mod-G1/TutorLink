export interface BookingRequest {
  tutorId: string;
  studentId: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  lessonType: string; // e.g. "Math", "Physics", "English", etc.
}

export interface BookingResponse {
  id: string;
  tutorId: string;
  studentId: string;
  date: string;
  start: string;
  end: string;
  status: "confirmed" | "pending" | "cancelled";
  lessonType: string;
}
