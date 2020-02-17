import express, { Request, Response, Express, Handler } from "express";
import asyncHandler from "express-async-handler";
import cors from "cors";
import { Operation, Result, isSuccess } from "../shared/Operation";
import { EventEmitter } from "events";

let currentParams: { [key: string]: string } = null;
export const useParams = () => ({ ...currentParams });

const createRequestHandler = <I, O>(operation: Operation<I, O>) =>
  asyncHandler(async (req: Request, res: Response) => {
    currentParams = req.params;

    const input: I = req.body || undefined;
    const output = await operation(input);

    return res.status(output.status).json(
      isSuccess(output)
        ? {
            success: true,
            payload: output.payload
          }
        : { success: false, error: output.error }
    );
  });

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
}

export class TypeSafeExpress extends EventEmitter {
  private server: Express;

  constructor(private publicDir: string) {
    super();
    this.server = express()
      .use(express.json())
      .use(cors());
  }

  serve(path: string, file: string) {
    this.server.get(path, (_, res) =>
      res.sendFile(`${this.publicDir}/${file}`)
    );
  }

  get<O>(path: string, operation: Operation<never, O>) {
    this.server.get(path, createRequestHandler(operation));
  }

  post<O>(path: string, operation: Operation<never, O>) {
    this.server.post(path, createRequestHandler(operation));
  }

  put<I>(path: string, operation: Operation<I, boolean>) {
    this.server.put(path, createRequestHandler(operation));
  }

  delete<I>(path: string, operation: Operation<I, boolean>) {
    this.server.delete(path, createRequestHandler(operation));
  }

  listen(port: number) {
    console.log(`Server listening on port ${port}`);
    this.catchAll();

    this.server.listen(port).on("error", (error: ErrnoException) => {
      this.emit("error", error);
    });
  }

  private catchAll() {
    this.server.use(
      (
        error: Error & { status: number },
        req: Request,
        res: Response,
        next: Handler
      ) => {
        console.error(error.stack);
        return res.status(error.status || 500).json({
          success: false,
          error
        });
      }
    );
  }
}

export const ok = <O>(payload?: O): Result<O> => ({
  status: 200,
  payload
});

export const fail = <O>(status: number, error: string): Result<O> => ({
  status,
  error
});
