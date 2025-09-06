/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.SetJsLocation
 *
 * This transform sets JavaScript location information on tree nodes that implement HasJsLocation.
 * It traverses the tree and updates the jsLocation property on nodes that support it.
 */

import { AbstractTreeTransformation } from "../TreeTransformation.js";
import { JsLocation, type JsLocationHas } from "../JsLocation.js";
import type {
	TsContainer,
	TsDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsParsedFile,
	TsTree,
} from "../trees.js";

/**
 * Transform that sets JavaScript location information on tree nodes.
 * 
 * This transform extends TreeTransformation with JsLocation as the context type.
 * It updates the jsLocation property on nodes that implement HasJsLocation interface.
 * 
 * The transform works by:
 * 1. Checking if a node implements HasJsLocation (has withJsLocation method)
 * 2. If yes, calling withJsLocation to update the node with the current location
 * 3. If no, leaving the node unchanged
 * 4. Using the withTree method to navigate into child nodes using JsLocation's / operator
 */
export class SetJsLocation extends AbstractTreeTransformation<JsLocation> {
	/**
	 * Updates the context when entering a tree node.
	 * This navigates into the tree using the JsLocation's navigate method.
	 */
	withTree(jsLocation: JsLocation, tree: TsTree): JsLocation {
		return JsLocation.navigate(jsLocation, tree);
	}

	/**
	 * Processes TsDecl nodes, setting JS location if they implement HasJsLocation.
	 */
	override enterTsDecl(jsLocation: JsLocation): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			// Check if this declaration implements HasJsLocation
			if (this.hasJsLocation(x)) {
				return x.withJsLocation(jsLocation);
			}
			return x;
		};
	}

	/**
	 * Processes TsContainer nodes, setting JS location if they implement HasJsLocation.
	 */
	override enterTsContainer(jsLocation: JsLocation): (x: TsContainer) => TsContainer {
		return (x: TsContainer) => {
			// Check if this container implements HasJsLocation
			if (this.hasJsLocation(x)) {
				return x.withJsLocation(jsLocation);
			}
			return x;
		};
	}

	/**
	 * Processes TsParsedFile nodes. TsParsedFile does NOT implement HasJsLocation in the Scala version,
	 * so we leave it unchanged.
	 */
	override enterTsParsedFile(jsLocation: JsLocation): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => {
			// TsParsedFile does NOT implement JsLocation.Has in Scala, so leave unchanged
			return x;
		};
	}

	/**
	 * Processes TsDeclClass nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclClass(jsLocation: JsLocation): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => {
			// TsDeclClass always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Processes TsDeclInterface nodes, setting JS location if they implement HasJsLocation.
	 */
	override enterTsDeclInterface(jsLocation: JsLocation): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => {
			// TsDeclInterface does not implement JsLocation.Has in Scala, so leave unchanged
			return x;
		};
	}

	/**
	 * Processes TsDeclNamespace nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclNamespace(jsLocation: JsLocation): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => {
			// TsDeclNamespace always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Processes TsDeclModule nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclModule(jsLocation: JsLocation): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => {
			// TsDeclModule always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Processes TsDeclVar nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclVar(jsLocation: JsLocation): (x: TsDeclVar) => TsDeclVar {
		return (x: TsDeclVar) => {
			// TsDeclVar always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Processes TsDeclFunction nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclFunction(jsLocation: JsLocation): (x: TsDeclFunction) => TsDeclFunction {
		return (x: TsDeclFunction) => {
			// TsDeclFunction always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Processes TsDeclTypeAlias nodes, setting JS location if they implement HasJsLocation.
	 */
	override enterTsDeclTypeAlias(jsLocation: JsLocation): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => {
			// TsDeclTypeAlias does not implement JsLocation.Has in Scala, so leave unchanged
			return x;
		};
	}

	/**
	 * Processes TsDeclEnum nodes, setting JS location since they implement HasJsLocation.
	 */
	override enterTsDeclEnum(jsLocation: JsLocation): (x: TsDeclEnum) => TsDeclEnum {
		return (x: TsDeclEnum) => {
			// TsDeclEnum always implements JsLocation.Has
			return x.withJsLocation(jsLocation);
		};
	}

	/**
	 * Type guard to check if an object implements HasJsLocation.
	 * An object implements HasJsLocation if it has both jsLocation property and withJsLocation method.
	 */
	private hasJsLocation(obj: any): obj is { jsLocation: JsLocation; withJsLocation(newLocation: JsLocation): any } {
		return (
			obj != null &&
			typeof obj === "object" &&
			"jsLocation" in obj &&
			"withJsLocation" in obj &&
			typeof obj.withJsLocation === "function"
		);
	}
}

/**
 * Singleton instance of SetJsLocation for convenient usage.
 * Equivalent to the Scala object SetJsLocation.
 */
export const SetJsLocationTransform = new SetJsLocation();

/**
 * Static transform function for functional usage.
 */
export const SetJsLocationTransformFunction = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsDecl: (jsLocation: JsLocation) => (x: TsDecl): TsDecl => {
		return SetJsLocationTransform.enterTsDecl(jsLocation)(x);
	},

	enterTsContainer: (jsLocation: JsLocation) => (x: TsContainer): TsContainer => {
		return SetJsLocationTransform.enterTsContainer(jsLocation)(x);
	},

	enterTsParsedFile: (jsLocation: JsLocation) => (x: TsParsedFile): TsParsedFile => {
		return SetJsLocationTransform.enterTsParsedFile(jsLocation)(x);
	},

	withTree: (jsLocation: JsLocation, tree: TsTree): JsLocation => {
		return SetJsLocationTransform.withTree(jsLocation, tree);
	},
};