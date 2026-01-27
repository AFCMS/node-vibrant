import { describe, it, expectTypeOf } from "vitest";

import { BasicPipeline } from "../src";

describe("BasicPipeline types", () => {
	it("is not any", () => {
		expectTypeOf(BasicPipeline).not.toBeAny();
	});
});
