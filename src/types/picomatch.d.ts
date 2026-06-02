declare module "picomatch" {
  interface PicomatchOptions {
    dot?: boolean;
  }

  interface Picomatch {
    isMatch(input: string, glob: string, options?: PicomatchOptions): boolean;
  }

  const picomatch: Picomatch;
  export default picomatch;
}
