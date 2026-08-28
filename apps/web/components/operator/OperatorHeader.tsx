import type {
  OperatorUser,
} from '@/lib/operator-types';

import { LogOut } from 'lucide-react';

type Props = {
  user: OperatorUser | null;
  onLogout: () => void;
};

export default function OperatorHeader({
  user,
  onLogout,
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
          Move relief funds from source to eligible beneficiary with a complete audit trail.
        </p>
      </div>

      <div className="operator-user">
        <div className="operator-user-identity">
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

        <button
          type="button"
          className="operator-topbar-signout"
          onClick={onLogout}
          aria-label="Sign out"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>

      </div>

    </header>
  );
}
