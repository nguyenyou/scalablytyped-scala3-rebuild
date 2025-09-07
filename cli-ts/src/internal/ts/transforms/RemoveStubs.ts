/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.RemoveStubs
 * 
 * Some libraries add their own version of interfaces declared in std.
 * 
 * This is for two reasons:
 * 1) define an empty type so you can compile and use the lib without say the DOM definitions
 * 2) extend the definitions because the library has monkey patched global functionality
 * 
 * This takes care of 1) by removing them (will be fine with and without DOM definitions)
 * 2) is mostly a stupid idea anyway.
 */

import { IArray } from "../../IArray.js";
import { TsTreeScope } from "../TsTreeScope.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";

import {
	TsDeclInterface,
	TsGlobal,
	TsIdent,
	TsIdentNode,
	TsIdentStd,
	TsParsedFile,
	TsQIdent,
	type TsContainerOrDecl,
} from "../trees.js";

/**
 * Main RemoveStubs transformation object
 */
export const RemoveStubs = {
	/**
	 * Apply the RemoveStubs transformation
	 */
	apply: () => {
		return new RemoveStubsVisitor();
	},
};

/**
 * Visitor that removes stub declarations (empty interfaces that duplicate std/node definitions)
 */
class RemoveStubsVisitor extends TreeTransformationScopedChanges {
	/**
	 * Transform parsed files by cleaning their members
	 */
	override enterTsParsedFile(scope: TsTreeScope): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => {
			const cleanedMembers = this.clean(scope, x.members);
			return TsParsedFile.create(
				x.comments,
				x.directives,
				cleanedMembers,
				x.codePath
			);
		};
	}

	/**
	 * Transform global declarations by cleaning their members
	 */
	override enterTsGlobal(scope: TsTreeScope): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => {
			const cleanedMembers = this.clean(scope, x.members);
			return TsGlobal.create(
				x.comments,
				x.declared,
				cleanedMembers,
				x.codePath
			);
		};
	}

	/**
	 * Clean a list of container or declaration members by filtering out stub interfaces
	 */
	private clean(scope: TsTreeScope, members: IArray<TsContainerOrDecl>): IArray<TsContainerOrDecl> {
		return members.filter(member => {
			// Check if this is an empty interface that might be a stub
			if (member._tag === "TsDeclInterface") {
				const iface = member as TsDeclInterface;

				// Only consider interfaces with no members AND no inheritance as potential stubs
				if (iface.members.isEmpty && iface.inheritance.isEmpty) {
					try {
						// Check if this interface name exists in std library
						const stdQIdent = TsQIdent.of(TsIdentStd, iface.name);
						const stdLookup = scope.root.lookupType(stdQIdent, true);

						// Check if this interface name exists in node library
						const nodeQIdent = TsQIdent.of(TsIdentNode, iface.name);
						const nodeLookup = scope.root.lookupType(nodeQIdent, true);

						// If the interface exists in either std or node libraries, it's a stub - remove it
						if (!stdLookup.isEmpty || !nodeLookup.isEmpty) {
							return false; // Filter out (remove) this stub interface
						}
					} catch (error) {
						// If lookup fails, be conservative and keep the interface
						return true;
					}
				}
			}

			// Keep all other declarations
			return true;
		});
	}
}
