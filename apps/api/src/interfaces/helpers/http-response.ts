export type ResponsePayload<T> = {
  status?: number;
  message?: string;
  data: T;
};

export type ResponseObject<T> = {
  status: number;
  message: string;
  data: T;
};
