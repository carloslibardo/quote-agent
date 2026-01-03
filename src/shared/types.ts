export type Result<T, E = Error> =
  | {
      success: true;
      data: T;
      error: null;
      message: string;
    }
  | {
      success: false;
      data: null;
      error: E;
      message: string;
    };
