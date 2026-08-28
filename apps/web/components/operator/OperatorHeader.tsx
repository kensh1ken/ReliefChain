import type {
  OperatorUser,
} from '@/lib/operator-types';

type Props = {
  user: OperatorUser | null;
};

export default function OperatorHeader({
  user,
}: Props) {
  return (
    <header className="operator-header">

      <div>
        <span className="operator-eyebrow">
          OPERATOR CONSOLE
        </span>

        <h1>
          Fund operations
        </h1>

        <p>
          Create and track relief transactions.
        </p>
      </div>

      <div className="operator-user">

        <div className="operator-user-avatar">
          {(
            user?.displayName ??
            'OP'
          )
            .split(' ')
            .map(
              (
                name,
              ) => name[0],
            )
            .join('')
            .slice(
              0,
              2,
            )
            .toUpperCase()}
        </div>

        <div>
          <strong>
            {user?.displayName ??
              'Operator'}
          </strong>

          <span>
            {user?.organization ??
              'ReliefChain'}
          </span>
        </div>

      </div>

    </header>
  );
}