import { List } from 'immutable-ext';

// Definitions
// ====================
const Right = x => ({
  chain: f => f(x),
  ap: other => other.map(x),
  alt: other => Right(x),
  extend: f => f(Right(x)),
  concat: other =>
    other.fold(
      x => other,
      y => Right(x.concat(y)),
    ),
  traverse: (of, f) => f(x).map(Right),
  map: f => Right(f(x)),
  fold: (_, g) => g(x),
  toString: () => `Right(${x})`,
});
const id = x => x;
const Left = x => ({
  chain: _ => Left(x),
  ap: _ => Left(x),
  extend: _ => Left(x),
  alt: other => other,
  concat: _ => Left(x),
  traverse: (of, _) => of(Left(x)),
  map: _ => Left(x),
  fold: (f, _) => f(x),
  toString: () => `Left(${x})`,
});

const Either = { Right, Left, of: Right };

const fromNullable = x => (x != null ? Right(x) : Left(null));

const tryCatch = f => {
  try {
    return Right(f());
  } catch (e) {
    return Left(e);
  }
};

const Pred = run => ({
  run,
  contramap: f => Pred(x => run(f(x))),
  concat: other => Pred(x => run(x) && other.run(x)),
}); // todo
const Endo = run => ({
  run,
  concat: other => Endo(x => other.run(run(x))),
});
Endo.empty = () => Endo(x => x);

// (acc, a) -> acc
// (a, acc) -> acc
// a -> (acc -> acc)
// a -> Endo(acc -> acc)

// Fn(a -> Endo(acc -> acc))
const Reducer = run => ({
  run,
  contramap: f => Reducer((acc, x) => run(acc, f(x))),
  concat: other => Reducer((acc, x) => other.run(run(acc, x), x)),
});

const Fn = run => ({
  run,
  chain: f => Fn(x => f(run(x)).run(x)),
  map: f => Fn(x => f(run(x))),
  concat: other => Fn(x => run(x).concat(other.run(x))),
});

Fn.ask = Fn(x => x);
Fn.of = x => Fn(() => x);
export { id, Fn, Reducer, Endo, Either, tryCatch, fromNullable };
