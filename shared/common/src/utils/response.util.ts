import { ApiResponse, PaginationMeta, ValidationError } from '@shared/types';

export class ResponseUtil {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(message: string, errors?: ValidationError[]): ApiResponse {
    return {
      success: false,
      message,
      errors,
    };
  }

  static paginated<T>(
    data: T,
    meta: PaginationMeta,
    message?: string
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      meta,
      message,
    };
  }
}
