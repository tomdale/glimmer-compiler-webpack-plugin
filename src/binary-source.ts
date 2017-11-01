import { RawSource } from "webpack-sources";

export default class BinarySource extends RawSource {
  constructor(source: ArrayBuffer) {
    super(source as any);
  }

  size() {
    return (this.source() as any as ArrayBuffer).byteLength;
  }
}
