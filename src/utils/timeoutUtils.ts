export async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  
  return Promise.race([Promise.resolve(promise), timeoutPromise]);
}
