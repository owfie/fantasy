/**
 * Remark Plugin: Entity Links
 * Transforms player and team names in markdown into clickable links
 */

import type { LinkableEntity } from './entity-linker';
import { getSortedPatterns } from './entity-linker';

// Inline types to avoid module resolution issues with pnpm
interface TextNode {
  type: 'text';
  value: string;
}

interface LinkNode {
  type: 'link';
  url: string;
  children: TextNode[];
}

interface ParentNode {
  type: string;
  children: Array<TextNode | LinkNode | ParentNode>;
}

interface RootNode extends ParentNode {
  type: 'root';
}

interface RemarkEntityLinksOptions {
  entityMap: Map<string, LinkableEntity>;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build URL for entity based on type
 */
function getEntityUrl(entity: LinkableEntity): string {
  if (entity.type === 'player') {
    return `/players/${entity.slug}`;
  }
  return `/teams/${entity.slug}`;
}

/**
 * Simple tree visitor function
 */
function visitTextNodes(
  node: ParentNode | TextNode | LinkNode,
  parent: ParentNode | null,
  index: number | null,
  callback: (node: TextNode, parent: ParentNode, index: number) => void
): void {
  if (node.type === 'text' && parent !== null && index !== null) {
    callback(node as TextNode, parent, index);
    return;
  }

  if ('children' in node && Array.isArray(node.children)) {
    // Process children in reverse order to handle splice correctly
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      visitTextNodes(child as ParentNode | TextNode | LinkNode, node, i, callback);
    }
  }
}

/**
 * Remark plugin to auto-link player and team names
 */
export function remarkEntityLinks(options: RemarkEntityLinksOptions) {
  const { entityMap } = options;
  const patterns = getSortedPatterns(entityMap);

  // Build combined regex pattern for all entities
  // Use word boundaries and optional possessive suffix
  const patternParts = patterns.map((p) => escapeRegex(p));
  if (patternParts.length === 0) {
    // No entities to match, return no-op transformer
    return (tree: RootNode) => tree;
  }

  // Match entity names with word boundaries, allowing possessive 's
  // Case-insensitive matching
  const combinedPattern = new RegExp(
    `\\b(${patternParts.join('|')})('s)?\\b`,
    'gi'
  );

  // Return the transformer function
  return (tree: RootNode) => {
    visitTextNodes(tree, null, null, (node: TextNode, parent: ParentNode, index: number) => {
      // Skip if parent is already a link
      if (parent.type === 'link') {
        return;
      }

      const text = node.value;
      const matches: Array<{
        start: number;
        end: number;
        matchedText: string;
        entity: LinkableEntity;
      }> = [];

      // Find all matches
      let match: RegExpExecArray | null;
      combinedPattern.lastIndex = 0; // Reset regex state

      while ((match = combinedPattern.exec(text)) !== null) {
        const matchedName = match[1]; // The entity name without possessive
        const fullMatch = match[0];
        const entity = entityMap.get(matchedName.toLowerCase());

        if (entity) {
          matches.push({
            start: match.index,
            end: match.index + fullMatch.length,
            matchedText: fullMatch,
            entity,
          });
        }
      }

      if (matches.length === 0) {
        return;
      }

      // Build new nodes: alternating text and link nodes
      const newNodes: (TextNode | LinkNode)[] = [];
      let lastEnd = 0;

      for (const m of matches) {
        // Add text before match
        if (m.start > lastEnd) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastEnd, m.start),
          });
        }

        // Add link node
        newNodes.push({
          type: 'link',
          url: getEntityUrl(m.entity),
          children: [{ type: 'text', value: m.matchedText }],
        });

        lastEnd = m.end;
      }

      // Add remaining text after last match
      if (lastEnd < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastEnd),
        });
      }

      // Replace the original node with new nodes
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}
