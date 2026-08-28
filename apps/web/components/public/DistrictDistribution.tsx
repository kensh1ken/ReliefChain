'use client';

import {
  ChevronDown,
} from 'lucide-react';

import {
  money,
} from '@/lib/api';

export type District = {
  district_code: string;
  scheme_name: string;
  source_type: string;
  beneficiary_count: number;
  disbursed_paise: number;
  pending_paise: number;
};

type DistrictDistributionProps = {
  districts: District[];

  selectedDistrict:
    | string
    | null;

  onSelect: (
    districtCode:
      | string
      | null,
  ) => void;
};

const DISTRICT_NAMES: Record<
  string,
  string
> = {
  'AS-BRP': 'Barpeta',
  'AS-KAM': 'Kamrup',

  AS_BRP: 'Barpeta',
  AS_KAM: 'Kamrup',
};

function getDistrictName(
  code: string,
): string {
  return (
    DISTRICT_NAMES[code] ??
    code
      .replace(
        /^AS[-_]/i,
        '',
      )
      .replaceAll(
        '-',
        ' ',
      )
      .replaceAll(
        '_',
        ' ',
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      )
  );
}

export default function DistrictDistribution({
  districts,
  selectedDistrict,
  onSelect,
}: DistrictDistributionProps) {
  const fundedDistricts =
    districts.filter(
      (district) =>
        district.disbursed_paise >
          0 ||
        district.pending_paise >
          0,
    );

  return (
    <div className="district-distribution">

      {/* ================================================================ */}
      {/* DISTRICT SELECTOR                                                */}
      {/* ================================================================ */}

      <div className="district-selector">

        <label htmlFor="district-filter">
          DISTRICT
        </label>

        <div className="district-select-wrap">

          <select
            id="district-filter"
            value={
              selectedDistrict ??
              ''
            }
            onChange={(
              event,
            ) => {
              onSelect(
                event.target.value ||
                  null,
              );
            }}
          >
            <option value="">
              All funded districts
            </option>

            {fundedDistricts.map(
              (
                district,
              ) => (
                <option
                  key={
                    district.district_code
                  }
                  value={
                    district.district_code
                  }
                >
                  {getDistrictName(
                    district.district_code,
                  )}
                </option>
              ),
            )}
          </select>

          <ChevronDown
            size={15}
            className="district-select-icon"
          />

        </div>

      </div>

      {/* ================================================================ */}
      {/* DISTRICT TABLE                                                    */}
      {/* ================================================================ */}

      <div className="district-table">

        <div className="district-table-header">

          <span>
            District
          </span>

          <span>
            Families
          </span>

          <span>
            Disbursed
          </span>

        </div>

        {fundedDistricts.length ===
        0 ? (
          <div className="district-empty">

            <strong>
              No recorded district relief
            </strong>

            <span>
              Funded districts will appear
              here once public records are indexed.
            </span>

          </div>
        ) : (
          fundedDistricts
            .filter(
              (district) =>
                !selectedDistrict ||
                district.district_code ===
                  selectedDistrict,
            )
            .map(
              (
                district,
              ) => {

                const selected =
                  selectedDistrict ===
                  district.district_code;

                return (
                  <button
                    key={
                      district.district_code
                    }
                    type="button"
                    className={
                      selected
                        ? 'district-row district-row-selected'
                        : 'district-row'
                    }
                    onClick={() => {
                      onSelect(
                        selected
                          ? null
                          : district.district_code,
                      );
                    }}
                  >

                    {/* ------------------------------------------------ */}
                    {/* DISTRICT                                          */}
                    {/* ------------------------------------------------ */}

                    <div className="district-name">

                      <strong>
                        {getDistrictName(
                          district.district_code,
                        )}
                      </strong>

                      <span>
                        {district.scheme_name}
                      </span>

                    </div>

                    {/* ------------------------------------------------ */}
                    {/* FAMILIES                                          */}
                    {/* ------------------------------------------------ */}

                    <div className="district-families">
                      {district.beneficiary_count.toLocaleString(
                        'en-IN',
                      )}
                    </div>

                    {/* ------------------------------------------------ */}
                    {/* AMOUNT                                             */}
                    {/* ------------------------------------------------ */}

                    <div className="district-amount">

                      <strong>
                        {money(
                          district.disbursed_paise,
                        )}
                      </strong>

                    </div>

                  </button>
                );
              },
            )
        )}

      </div>

    </div>
  );
}