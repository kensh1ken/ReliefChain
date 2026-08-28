'use client';

import {
  ChangeEvent,
  FormEvent,
  useState,
} from 'react';

import {
  api,
  money,
} from '@/lib/api';

import type {
  OperatorContext,
} from '@/lib/operator-types';

import {
  ASSAM_DISTRICTS,
  districtNameFromCode,
} from '@/lib/assam-districts';

type Kind =
  | 'payout'
  | 'source'
  | 'allocation'
  | 'beneficiary';

type Props = {
  data?: OperatorContext;
  onReload: () => Promise<void>;
};

const tabs: {
  id: Kind;
  label: string;
  description: string;
}[] = [
  {
    id: 'source',
    label: 'Fund',
    description: 'Register disaster funding',
  },
  {
    id: 'allocation',
    label: 'Allocation',
    description: 'Assign a scheme and district',
  },
  {
    id: 'beneficiary',
    label: 'Beneficiary',
    description: 'Record scheme eligibility',
  },
  {
    id: 'payout',
    label: 'Payout',
    description: 'Pay from a matching allocation',
  },
];

export default function TransactionPanel({
  data,
  onReload,
}: Props) {
  const [
    kind,
    setKind,
  ] = useState<Kind>(
    'payout',
  );

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const selectedAllocation = data?.allocations.find((item) => item.id === selectedAllocationId) ?? data?.allocations[0];
  const linkedSource = data?.sources.find((item) => item.id === selectedAllocation?.source_id);
  const linkedScheme = data?.schemes.find((item) => item.id === selectedAllocation?.scheme_id);
  const eligibleBeneficiaries = data?.beneficiaries.filter((item) =>
    item.scheme_id === selectedAllocation?.scheme_id && item.district_code === selectedAllocation?.district_code,
  ) ?? [];

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage('');
    setBusy(true);

    const form =
      new FormData(
        event.currentTarget,
      );

    const rupees =
      Number(
        form.get('amount'),
      );

    if (
      !Number.isFinite(
        rupees,
      ) ||
      rupees <= 0
    ) {
      setMessage(
        'Enter a valid amount.',
      );

      setBusy(false);

      return;
    }

    let path = '';

    let body: Record<
      string,
      unknown
    > = {};

    if (
      kind === 'source'
    ) {
      path =
        '/operator/fund-sources';

      body = {
        disasterId:
          form.get(
            'disasterId',
          ),

        name:
          form.get(
            'name',
          ),

        sourceType:
          form.get(
            'sourceType',
          ),

        amountPaise:
          rupees * 100,
      };
    }

    if (
      kind ===
      'allocation'
    ) {
      path =
        '/operator/allocations';

      body = {
        sourceId:
          form.get(
            'sourceId',
          ),

        schemeId:
          form.get(
            'schemeId',
          ),

        districtCode:
          form.get(
            'districtCode',
          ),

        amountPaise:
          rupees * 100,
      };
    }

    if (
      kind ===
      'beneficiary'
    ) {
      path =
        '/operator/beneficiaries';

      body = {
        name:
          form.get(
            'name',
          ),

        aadhaar:
          form.get(
            'aadhaar',
          ),

        phone:
          form.get(
            'phone',
          ),

        schemeId:
          form.get(
            'schemeId',
          ),

        districtCode:
          form.get(
            'districtCode',
          ),

        promisedPaise:
          rupees * 100,
      };
    }

    if (
      kind ===
      'payout'
    ) {
      path =
        '/operator/disbursements';

      body = {
        allocationId:
          form.get(
            'allocationId',
          ),

        beneficiaryId:
          form.get(
            'beneficiaryId',
          ),

        amountPaise:
          rupees * 100,

        idempotencyKey:
          `portal-${crypto.randomUUID()}`,

        simulatedOutcome:
          form.get(
            'outcome',
          ),
      };
    }

    try {
      await api(
        path,
        {
          method: 'POST',
          body:
            JSON.stringify(
              body,
            ),
        },
      );

      setMessage(
        'Transaction submitted.',
      );

      setAmount('');

      event.currentTarget.reset();

      await onReload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Transaction failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="operator-panel">

      <div className="operator-panel-header">
        <div>
          <span>
            LEDGER ACTION
          </span>

          <h2>
            Create a connected transaction
          </h2>

          <p>Follow the funding chain or perform the next operational action.</p>
        </div>
      </div>

      <div className="operator-tabs">

        {tabs.map(
          ({
            id,
            label,
            description,
          }, index) => (
            <button
              key={id}
              type="button"
              className={
                kind === id
                  ? 'operator-tab active'
                  : 'operator-tab'
              }
              onClick={() =>
                setKind(id)
              }
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{label}</strong>
              <small>{description}</small>
            </button>
          ),
        )}

      </div>

      <form
        onSubmit={submit}
        className="operator-form"
      >

        {/* ============================================================ */}
        {/* FUND                                                         */}
        {/* ============================================================ */}

        {kind ===
          'source' && (
          <>
            <Field
              label="Fund name"
              name="name"
              placeholder="Relief fund name"
            />

            <Select
              label="Disaster"
              name="disasterId"
            >
              {data?.disasters.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Source type"
              name="sourceType"
              defaultValue="STATE_GOVERNMENT"
            >
              <option value="STATE_GOVERNMENT">
                State government
              </option>

              <option value="CENTRAL_GOVERNMENT">
                Central government
              </option>

              <option value="NGO">
                NGO
              </option>
            </Select>
          </>
        )}

        {/* ============================================================ */}
        {/* ALLOCATION                                                    */}
        {/* ============================================================ */}

        {kind ===
          'allocation' && (
          <>
            <Select
              label="Fund source"
              name="sourceId"
            >
              {data?.sources.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                    {' · '}
                    {money(
                      item.amount_paise -
                        item.allocated_paise,
                    )}
                    {' available'}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Scheme"
              name="schemeId"
            >
              {data?.schemes.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="District (Assam)"
              name="districtCode"
              defaultValue="AS-KAM"
            >
              {ASSAM_DISTRICTS.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {/* ============================================================ */}
        {/* BENEFICIARY                                                   */}
        {/* ============================================================ */}

        {kind ===
          'beneficiary' && (
          <>
            <Field
              label="Synthetic name"
              name="name"
              placeholder="Beneficiary name"
            />

            <Field
              label="Synthetic Aadhaar"
              name="aadhaar"
              placeholder="12 digit identifier"
              pattern="[0-9]{12}"
            />

            <Field
              label="Registered phone"
              name="phone"
              defaultValue="+91"
              pattern="\+91[0-9]{10}"
            />

            <Select
              label="District (Assam)"
              name="districtCode"
              defaultValue="AS-KAM"
            >
              {ASSAM_DISTRICTS.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </Select>

            <Select
              label="Scheme"
              name="schemeId"
            >
              {data?.schemes.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </Select>
          </>
        )}

        {/* ============================================================ */}
        {/* PAYOUT                                                        */}
        {/* ============================================================ */}

        {kind ===
          'payout' && (
          <>
            <Select
              label="Allocation"
              name="allocationId"
              value={selectedAllocation?.id ?? ''}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedAllocationId(event.target.value)}
            >
              {data?.allocations.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {districtNameFromCode(item.district_code)}
                    {' · '}
                    {money(
                      item.amount_paise -
                        item.reserved_paise -
                        item.disbursed_paise,
                    )}
                    {' available'}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Beneficiary"
              name="beneficiaryId"
            >
              {eligibleBeneficiaries.map(
                (
                  item,
                ) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {districtNameFromCode(item.district_code)}
                    {' · '}
                    {
                      item
                        .beneficiary_ref
                        .slice(
                          0,
                          18,
                        )
                    }
                    …
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Outcome"
              name="outcome"
              defaultValue="SETTLED"
            >
              <option value="SETTLED">
                Success
              </option>

              <option value="FAILED">
                Failure
              </option>
            </Select>
          </>
        )}

        {kind === 'payout' && selectedAllocation && (
          <div className="operator-link-preview">
            <span>PAYMENT ROUTE</span>
            <div>
              <strong>{linkedSource?.name ?? 'Fund source'}</strong>
              <i>→</i>
              <strong>{linkedScheme?.name ?? 'Scheme'}</strong>
              <i>→</i>
              <strong>{districtNameFromCode(selectedAllocation.district_code)}</strong>
              <i>→</i>
              <strong>{eligibleBeneficiaries.length} eligible</strong>
            </div>
            <small>{money(selectedAllocation.amount_paise - selectedAllocation.reserved_paise - selectedAllocation.disbursed_paise)} remains available in this allocation.</small>
          </div>
        )}

        {/* ============================================================ */}
        {/* AMOUNT                                                        */}
        {/* ============================================================ */}

        <Field
          label={
            kind ===
            'beneficiary'
              ? 'Promised amount (₹)'
              : 'Amount (₹)'
          }
          name="amount"
          type="number"
          min="1"
          value={amount}
          onChange={(
            event: ChangeEvent<HTMLInputElement>,
          ) =>
            setAmount(
              event.target.value,
            )
          }
        />

        {/* ============================================================ */}
        {/* SUBMIT                                                        */}
        {/* ============================================================ */}

        <div className="operator-submit-row">

          {message && (
            <span
              className={
                message ===
                'Transaction submitted.'
                  ? 'operator-message success'
                  : 'operator-message error'
              }
            >
              {message}
            </span>
          )}

          <button
            type="submit"
            className="operator-submit"
            disabled={busy}
          >
            {busy
              ? 'Submitting...'
              : 'Submit to ledger'}
          </button>

        </div>

      </form>

    </section>
  );
}

/* ==========================================================================
   FIELD
   ========================================================================== */

function Field({
  label,
  name,
  type = 'text',
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  [key: string]: unknown;
}) {
  return (
    <div className="operator-field">
      <label>
        {label}
      </label>

      <input
        name={name}
        type={type}
        {...props}
        required
      />
    </div>
  );
}

/* ==========================================================================
   SELECT
   ========================================================================== */

function Select({
  label,
  name,
  children,
  ...props
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  return (
    <div className="operator-field">
      <label>
        {label}
      </label>

      <select
        name={name}
        {...props}
        required
      >
        {children}
      </select>
    </div>
  );
}
