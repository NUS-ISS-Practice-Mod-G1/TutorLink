import { AxiosResponse } from "axios";
import { getApiInstance } from "./axios/instanceAPI";

const BASE_URL = `/tutors`;

export const UpdateTutorProfile = async (
  token: string,
  userId: string,
  data: FormData
): Promise<AxiosResponse<any>> => {
  const url = `${BASE_URL}/${userId}`;
  const api = getApiInstance(token);

  return await api.put(url, data, {
    headers: {
      ...api.defaults.headers.common,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const GetTutorProfile = async (
  token: string,
  userId: string
): Promise<AxiosResponse<any>> => {
  const url = `${BASE_URL}/${userId}`;
  const api = getApiInstance(token);
  return await api.get(url);
};

export const GetTutorFileViewUrl = async (
  token: string,
  fileKey: string
): Promise<AxiosResponse<string>> => {
  const api = getApiInstance(token);
  const url = `${BASE_URL}/qualifications/url?key=${encodeURIComponent(fileKey)}`;
  return await api.get(url);
};


export const UploadTutorProfilePicture = async (
  tutorId: string,
  file: File,
  token: string
): Promise<AxiosResponse<any>> => {
  const formData = new FormData();
  formData.append("file", file);

  const api = getApiInstance(token);

  return await api.post(`${BASE_URL}/${tutorId}/profile-picture`, formData, {
    headers: {
      ...api.defaults.headers.common,
      "Content-Type": "multipart/form-data",
    },
  });
};

/** Add a review for a tutor */
export const AddTutorReview = async (
  token: string,
  tutorId: string,
  review: {
    bookingId: string;
    studentName: string;
    rating: number;
    comment: string;
  }
): Promise<AxiosResponse<any>> => {
  const api = getApiInstance(token);
  const url = `${BASE_URL}/${tutorId}/review`;
  return await api.post(url, review);
};

/** Get all reviews for a specific tutor by userId */
export const GetTutorReviewsByUserId = async (
  token: string,
  userId: string
): Promise<AxiosResponse<any>> => {
  const api = getApiInstance(token);
  const url = `${BASE_URL}/${userId}/reviews`;
  return await api.get(url);
};
