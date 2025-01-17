import { createElement, memo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { arrayMount$, arrayPatch$ } from '../million/array';
import { mapArray, block as createBlock } from '../million';
import { MapSet$, MapHas$, MapGet$ } from '../million/constants';
import { REGISTRY } from './block';
import type { Props } from '../million';
import type { FC, ReactNode, MutableRefObject } from 'react';

interface MillionArrayProps {
  each: any[];
  children: (value: any, i: number) => ReactNode;
}

interface ArrayCache {
  each: any[] | null;
  children: any[] | null;
  block?: ReturnType<typeof createBlock>;
}

const MillionArray: FC<MillionArrayProps> = ({ each, children }) => {
  const ref = useRef<HTMLElement>(null);
  const fragmentRef = useRef<ReturnType<typeof mapArray> | null>(null);
  const cache = useRef<ArrayCache>({
    each: null,
    children: null,
  });
  if (fragmentRef.current && each !== cache.current.each) {
    const newChildren = createChildren(each, children, cache);
    arrayPatch$.call(fragmentRef.current, mapArray(newChildren));
  }
  useEffect(() => {
    if (fragmentRef.current) return;
    const newChildren = createChildren(each, children, cache);
    fragmentRef.current = mapArray(newChildren);
    arrayMount$.call(fragmentRef.current, ref.current!);
  }, []);

  return createElement('million-fragment', { ref });
};

export const For = memo(MillionArray, (oldProps, newProps) =>
  Object.is(newProps.each, oldProps.each),
);

const createChildren = (
  each: any[],
  getComponent: any,
  cache: MutableRefObject<ArrayCache>,
) => {
  const children = Array(each.length);
  for (let i = 0, l = each.length; i < l; ++i) {
    if (cache.current.each && cache.current.each[i] === each[i]) {
      children[i] = cache.current.children?.[i];
      continue;
    }
    const vnode = getComponent(each[i], i);

    if (MapHas$.call(REGISTRY, vnode.type)) {
      if (!cache.current.block) {
        cache.current.block = MapGet$.call(REGISTRY, vnode.type)!;
      }
      children[i] = cache.current.block!(vnode.props);
    } else {
      const block = createBlock((props?: Props) => {
        return {
          type: 'million-block',
          props: { children: [props?.__l] },
        } as any;
      });
      const currentBlock = (props: Props) => {
        return block({
          props,
          __l: (el: HTMLElement) => {
            createRoot(el).render(createElement(vnode.type, props));
          },
        });
      };

      MapSet$.call(REGISTRY, vnode.type, currentBlock);
      cache.current.block = currentBlock as ReturnType<typeof createBlock>;
      children[i] = currentBlock(vnode.props);
    }
  }
  cache.current.each = each;
  cache.current.children = children;
  return children;
};
