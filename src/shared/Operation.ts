export type SuccessResult<O> = {
  payload: O;
};

export type FailureResult = {
  error: string;
};

export type Result<O> = (SuccessResult<O> | FailureResult) & {
  status: number;
};

export type HttpResponse<O> =
  | (SuccessResult<O> & {
      success: true;
    })
  | (FailureResult & {
      success: false;
    });

export type Operation<I, O> = (input?: I) => Promise<Result<O>>;

export const isSuccess = <O>(
  result: SuccessResult<O> | FailureResult
): result is SuccessResult<O> => (result as FailureResult).error === undefined;
