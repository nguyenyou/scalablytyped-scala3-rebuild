/**
 * Tests for Comments.ts - TypeScript port of org.scalablytyped.converter.internal.Comments
 */

import * as O from "fp-ts/Option";
import { describe, expect, it } from "bun:test";
import { IsTrivial, type Marker, NameHint, Raw } from "../internal/Comment.js";
import {
	Comments,
	CommentsDecoder,
	CommentsEncoder,
	NoComments,
} from "../internal/Comments.js";
import { IArray } from "../internal/IArray.js";

describe("Comments", () => {
	describe("Comments class", () => {
		describe("constructor and basic properties", () => {
			it("should create Comments with empty list", () => {
				const comments = new Comments([]);
				expect(comments.cs).toEqual([]);
				expect(comments.isEmpty).toBe(true);
				expect(comments.nonEmpty).toBe(false);
			});

			it("should create Comments with comment list", () => {
				const raw1 = new Raw("comment 1");
				const raw2 = new Raw("comment 2");
				const comments = new Comments([raw1, raw2]);

				expect(comments.cs).toEqual([raw1, raw2]);
				expect(comments.isEmpty).toBe(false);
				expect(comments.nonEmpty).toBe(true);
				expect(comments.cs.length).toBe(2);
			});

			it("should have correct toString representation", () => {
				const comments = new Comments([new Raw("test")]);
				expect(comments.toString()).toBe("Comments(1)");

				const emptyComments = new Comments([]);
				expect(emptyComments.toString()).toBe("Comments(0)");
			});

			it("should have hashCode of 0", () => {
				const comments = new Comments([new Raw("test")]);
				expect(comments.hashCode).toBe(0);
			});

			it("should implement equals correctly", () => {
				const comments1 = new Comments([new Raw("test")]);
				const comments2 = new Comments([new Raw("different")]);
				const notComments = { cs: [] };

				expect(comments1.equals(comments2)).toBe(true);
				expect(comments1.equals(notComments)).toBe(false);
				expect(comments1.equals(null)).toBe(false);
				expect(comments1.equals(undefined)).toBe(false);
			});
		});

		describe("rawCs property", () => {
			it("should extract raw comment strings", () => {
				const raw1 = new Raw("first comment");
				const raw2 = new Raw("second comment");
				const marker = new NameHint("test hint");
				const comments = new Comments([raw1, marker, raw2]);

				const rawStrings = comments.rawCs;
				expect(rawStrings).toEqual(["first comment", "second comment"]);
			});

			it("should return empty array when no raw comments", () => {
				const marker = new NameHint("test hint");
				const comments = new Comments([marker]);

				expect(comments.rawCs).toEqual([]);
			});

			it("should return empty array for empty comments", () => {
				const comments = new Comments([]);
				expect(comments.rawCs).toEqual([]);
			});
		});

		describe("extract method", () => {
			it("should extract matching marker and return remaining comments", () => {
				const raw = new Raw("test comment");
				const nameHint = new NameHint("test hint");
				const trivial = IsTrivial.instance;
				const comments = new Comments([raw, nameHint, trivial]);

				const result = comments.extract((marker: Marker) => {
					if (marker instanceof NameHint) {
						return marker.value;
					}
					throw new Error("Not a NameHint");
				});

				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					const [extracted, remaining] = result.value;
					expect(extracted).toBe("test hint");
					expect(remaining.cs).toEqual([raw, trivial]);
				}
			});

			it("should return None when no matching marker found", () => {
				const raw = new Raw("test comment");
				const trivial = IsTrivial.instance;
				const comments = new Comments([raw, trivial]);

				const result = comments.extract((marker: Marker) => {
					if (marker instanceof NameHint) {
						return marker.value;
					}
					throw new Error("Not a NameHint");
				});

				expect(O.isNone(result)).toBe(true);
			});

			it("should return None for empty comments", () => {
				const comments = new Comments([]);

				const result = comments.extract((_marker: Marker) => "test");

				expect(O.isNone(result)).toBe(true);
			});
		});

		describe("has method", () => {
			it("should return true when marker type exists", () => {
				const nameHint = new NameHint("test");
				const trivial = IsTrivial.instance;
				const comments = new Comments([nameHint, trivial]);

				expect(comments.has(NameHint)).toBe(true);
				expect(comments.has(IsTrivial)).toBe(true);
			});

			it("should return false when marker type does not exist", () => {
				const nameHint = new NameHint("test");
				const comments = new Comments([nameHint]);

				expect(comments.has(IsTrivial)).toBe(false);
			});

			it("should return false for empty comments", () => {
				const comments = new Comments([]);

				expect(comments.has(NameHint)).toBe(false);
			});
		});

		describe("concat method", () => {
			it("should concatenate two non-empty Comments", () => {
				const comments1 = new Comments([new Raw("first")]);
				const comments2 = new Comments([new Raw("second")]);

				const result = comments1.concat(comments2);

				expect(result.cs.length).toBe(2);
				expect((result.cs[0] as Raw).raw).toBe("first");
				expect((result.cs[1] as Raw).raw).toBe("second");
			});

			it("should return NoComments when both are empty", () => {
				const comments1 = new Comments([]);
				const comments2 = new Comments([]);

				const result = comments1.concat(comments2);

				expect(result).toBe(NoComments.instance);
			});

			it("should return first when second is empty", () => {
				const comments1 = new Comments([new Raw("test")]);
				const comments2 = new Comments([]);

				const result = comments1.concat(comments2);

				expect(result).toBe(comments1);
			});

			it("should return second when first is empty", () => {
				const comments1 = new Comments([]);
				const comments2 = new Comments([new Raw("test")]);

				const result = comments1.concat(comments2);

				expect(result).toBe(comments2);
			});
		});

		describe("concatOption method", () => {
			it("should concatenate with Some Comments", () => {
				const comments1 = new Comments([new Raw("first")]);
				const comments2 = new Comments([new Raw("second")]);

				const result = comments1.concatOption(O.some(comments2));

				expect(result.cs.length).toBe(2);
			});

			it("should return original when None", () => {
				const comments = new Comments([new Raw("test")]);

				const result = comments.concatOption(O.none);

				expect(result).toBe(comments);
			});
		});

		describe("add method", () => {
			it("should add comment to existing comments", () => {
				const comments = new Comments([new Raw("first")]);
				const newComment = new Raw("second");

				const result = comments.add(newComment);

				expect(result.cs.length).toBe(2);
				expect((result.cs[1] as Raw).raw).toBe("second");
			});

			it("should add comment to empty comments", () => {
				const comments = new Comments([]);
				const newComment = new Raw("test");

				const result = comments.add(newComment);

				expect(result.cs.length).toBe(1);
				expect((result.cs[0] as Raw).raw).toBe("test");
			});
		});

		describe("addOption method", () => {
			it("should add Some comment", () => {
				const comments = new Comments([new Raw("first")]);
				const newComment = new Raw("second");

				const result = comments.addOption(O.some(newComment));

				expect(result.cs.length).toBe(2);
			});

			it("should return original when None", () => {
				const comments = new Comments([new Raw("test")]);

				const result = comments.addOption(O.none);

				expect(result).toBe(comments);
			});
		});
	});

	describe("NoComments singleton", () => {
		it("should be a singleton", () => {
			const instance1 = NoComments.instance;
			const instance2 = NoComments.instance;

			expect(instance1).toBe(instance2);
		});

		it("should extend Comments with empty list", () => {
			const noComments = NoComments.instance;

			expect(noComments).toBeInstanceOf(Comments);
			expect(noComments.cs).toEqual([]);
			expect(noComments.isEmpty).toBe(true);
			expect(noComments.nonEmpty).toBe(false);
		});

		it("should have correct toString", () => {
			const noComments = NoComments.instance;

			expect(noComments.toString()).toBe("NoComments");
		});
	});

	describe("Comments namespace", () => {
		describe("create function", () => {
			it("should create Comments from head and tail strings", () => {
				const comments = Comments.create("first", "second", "third");

				expect(comments.cs.length).toBe(3);
				expect((comments.cs[0] as Raw).raw).toBe("first");
				expect((comments.cs[1] as Raw).raw).toBe("second");
				expect((comments.cs[2] as Raw).raw).toBe("third");
			});

			it("should create Comments from single string", () => {
				const comments = Comments.create("single");

				expect(comments.cs.length).toBe(1);
				expect((comments.cs[0] as Raw).raw).toBe("single");
			});

			it("should create Comments with no tail", () => {
				const comments = Comments.create("head");

				expect(comments.cs.length).toBe(1);
				expect((comments.cs[0] as Raw).raw).toBe("head");
			});
		});

		describe("apply function", () => {
			it("should create Comments from non-empty comment array", () => {
				const raw = new Raw("test");
				const marker = new NameHint("hint");
				const comments = Comments.apply([raw, marker]);

				expect(comments.cs).toEqual([raw, marker]);
				expect(comments).toBeInstanceOf(Comments);
				expect(comments).not.toBe(NoComments.instance);
			});

			it("should return NoComments for empty array", () => {
				const comments = Comments.apply([]);

				expect(comments).toBe(NoComments.instance);
			});
		});

		describe("fromOption function", () => {
			it("should create Comments from Some comment", () => {
				const raw = new Raw("test");
				const comments = Comments.fromOption(O.some(raw));

				expect(comments.cs).toEqual([raw]);
			});

			it("should return NoComments from None", () => {
				const comments = Comments.fromOption(O.none);

				expect(comments).toBe(NoComments.instance);
			});
		});

		describe("fromComment function", () => {
			it("should create Comments from single comment", () => {
				const raw = new Raw("test");
				const comments = Comments.fromComment(raw);

				expect(comments.cs).toEqual([raw]);
			});

			it("should create Comments from marker", () => {
				const marker = new NameHint("test");
				const comments = Comments.fromComment(marker);

				expect(comments.cs).toEqual([marker]);
			});
		});

		describe("flatten function", () => {
			it("should flatten array of objects to Comments", () => {
				const objects = IArray.apply("a", "b", "c");
				const mapFn = (s: string) => Comments.create(`comment-${s}`);

				const result = Comments.flatten(objects, mapFn);

				expect(result.cs.length).toBe(3);
				expect((result.cs[0] as Raw).raw).toBe("comment-a");
				expect((result.cs[1] as Raw).raw).toBe("comment-b");
				expect((result.cs[2] as Raw).raw).toBe("comment-c");
			});

			it("should remove duplicate comments", () => {
				const objects = IArray.apply("a", "a", "b");
				const mapFn = (s: string) => Comments.create(`comment-${s}`);

				const result = Comments.flatten(objects, mapFn);

				expect(result.cs.length).toBe(2);
				expect((result.cs[0] as Raw).raw).toBe("comment-a");
				expect((result.cs[1] as Raw).raw).toBe("comment-b");
			});

			it("should handle empty array", () => {
				const objects = IArray.Empty;
				const mapFn = (s: string) => Comments.create(`comment-${s}`);

				const result = Comments.flatten(objects, mapFn);

				expect(result).toBe(NoComments.instance);
			});

			it("should handle objects that produce empty comments", () => {
				const objects = IArray.apply("a", "b");
				const mapFn = (_: string) => NoComments.instance;

				const result = Comments.flatten(objects, mapFn);

				expect(result).toBe(NoComments.instance);
			});
		});

		describe("unapply function", () => {
			it("should extract comments array", () => {
				const raw = new Raw("test");
				const marker = new NameHint("hint");
				const comments = new Comments([raw, marker]);

				const result = Comments.unapply(comments);

				expect(result).toEqual([raw, marker]);
			});

			it("should extract empty array from NoComments", () => {
				const result = Comments.unapply(NoComments.instance);

				expect(result).toEqual([]);
			});
		});

		describe("format function", () => {
			it("should format raw comments", () => {
				const comments = Comments.create("/* test comment */");

				const result = Comments.format(comments);

				expect(result).toContain("test comment");
			});

			it("should handle empty comments", () => {
				const result = Comments.format(NoComments.instance);

				expect(result).toBe("");
			});

			it("should format multiple raw comments", () => {
				const comments = Comments.create("first", "second");

				const result = Comments.format(comments);

				expect(result).toContain("first");
				expect(result).toContain("second");
			});

			it("should ignore non-raw comments", () => {
				const raw = new Raw("test comment");
				const marker = new NameHint("hint");
				const comments = new Comments([raw, marker]);

				const result = Comments.format(comments);

				expect(result).toContain("test comment");
				expect(result).not.toContain("hint");
			});
		});

		describe("formatWithFlag function", () => {
			it("should format when keepComments is true", () => {
				const comments = Comments.create("test");

				const result = Comments.formatWithFlag(comments, true);

				expect(result).toContain("test");
			});

			it("should return empty string when keepComments is false", () => {
				const comments = Comments.create("test");

				const result = Comments.formatWithFlag(comments, false);

				expect(result).toBe("");
			});
		});
	});

	describe("Encoder/Decoder", () => {
		describe("CommentsEncoder", () => {
			it("should encode raw comments", () => {
				const comments = Comments.create("test comment");

				const encoded = CommentsEncoder.encode(comments);

				expect(encoded).toEqual([{ type: "Raw", raw: "test comment" }]);
			});

			it("should encode marker comments", () => {
				const marker = new NameHint("test hint");
				const comments = new Comments([marker]);

				const encoded = CommentsEncoder.encode(comments);

				expect(encoded[0].type).toBe("Marker");
				expect(encoded[0].markerTag).toBe("NameHint");
			});

			it("should encode empty comments", () => {
				const encoded = CommentsEncoder.encode(NoComments.instance);

				expect(encoded).toEqual([]);
			});
		});

		describe("CommentsDecoder", () => {
			it("should decode raw comments", () => {
				const data = [{ type: "Raw", raw: "test comment" }];

				const decoded = CommentsDecoder.decode(data);

				expect(decoded.cs.length).toBe(1);
				expect((decoded.cs[0] as Raw).raw).toBe("test comment");
			});

			it("should decode marker comments as raw comments", () => {
				const data = [{ type: "Marker", markerTag: "NameHint" }];

				const decoded = CommentsDecoder.decode(data);

				expect(decoded.cs.length).toBe(1);
				expect((decoded.cs[0] as Raw).raw).toContain("NameHint");
			});

			it("should decode empty array", () => {
				const decoded = CommentsDecoder.decode([]);

				expect(decoded).toBe(NoComments.instance);
			});
		});
	});

	describe("Edge cases and error handling", () => {
		it("should handle null and undefined gracefully", () => {
			const comments = new Comments([]);

			expect(comments.equals(null)).toBe(false);
			expect(comments.equals(undefined)).toBe(false);
		});

		it("should handle complex marker extraction scenarios", () => {
			const nameHint1 = new NameHint("first");
			const nameHint2 = new NameHint("second");
			const trivial = IsTrivial.instance;
			const comments = new Comments([nameHint1, trivial, nameHint2]);

			const result = comments.extract((marker: Marker) => {
				if (marker instanceof NameHint) {
					return marker.value;
				}
				throw new Error("Not a NameHint");
			});

			expect(O.isSome(result)).toBe(true);
			if (O.isSome(result)) {
				const [extracted, remaining] = result.value;
				expect(extracted).toBe("first"); // Should get the first matching marker
				expect(remaining.cs.length).toBe(2); // Should have trivial and second nameHint
			}
		});

		it("should handle large comment collections efficiently", () => {
			const largeCommentArray = Array.from(
				{ length: 1000 },
				(_, i) => new Raw(`comment-${i}`),
			);
			const comments = new Comments(largeCommentArray);

			expect(comments.cs.length).toBe(1000);
			expect(comments.rawCs.length).toBe(1000);
			expect(comments.nonEmpty).toBe(true);
		});
	});
});
