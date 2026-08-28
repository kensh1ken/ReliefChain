'use client';

import {
  Html,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';

import {
  Canvas,
  useFrame,
} from '@react-three/fiber';

import {
  geoMercator,
} from 'd3-geo';

import * as THREE from 'three';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  money,
} from '@/lib/api';

import type {
  District,
} from '@/app/page';

/* ==========================================================================
   TYPES
   ========================================================================== */

type GeoFeature = {
  type: 'Feature';

  properties: Record<
    string,
    unknown
  >;

  geometry: {
    type:
      | 'Polygon'
      | 'MultiPolygon';

    coordinates: unknown;
  };
};

type FeatureCollection = {
  type: 'FeatureCollection';

  features: GeoFeature[];
};

type PreparedFeature = {
  feature: GeoFeature;

  name: string;

  polygons:
    THREE.Shape[][];
};

type Props = {
  districts: District[];

  loading?: boolean;

  /*
   * NEW:
   * Page controls what happens after a funded
   * district is clicked.
   */
  onDistrictSelect?: (
    districtCode: string,
  ) => void;
};

/* ==========================================================================
   BACKEND CODE → DISPLAY NAME
   ========================================================================== */

const BACKEND_CODE_TO_NAME: Record<
  string,
  string
> = {
  'AS-BAK': 'Baksa',
  'AS-BAR': 'Barpeta',
  'AS-BIS': 'Biswanath',
  'AS-BON': 'Bongaigaon',
  'AS-CAC': 'Cachar',
  'AS-CHA': 'Charaideo',
  'AS-CHH': 'Charaideo',
  'AS-DAR': 'Darrang',
  'AS-DHE': 'Dhemaji',
  'AS-DHU': 'Dhubri',
  'AS-DIB': 'Dibrugarh',
  'AS-DIM': 'Dima Hasao',
  'AS-GOL': 'Golaghat',
  'AS-GOA': 'Goalpara',
  'AS-HOJ': 'Hojai',
  'AS-JOR': 'Jorhat',
  'AS-KAM': 'Kamrup',
  'AS-KMA': 'Kamrup Metropolitan',
  'AS-KAR': 'Karbi Anglong',
  'AS-KRI': 'Kokrajhar',
  'AS-LAK': 'Lakhimpur',
  'AS-MAJ': 'Majuli',
  'AS-MOR': 'Morigaon',
  'AS-NAG': 'Nagaon',
  'AS-NAL': 'Nalbari',
  'AS-SIV': 'Sivasagar',
  'AS-SON': 'Sonitpur',
  'AS-TIN': 'Tinsukia',
  'AS-UDL': 'Udalguri',
  'AS-WES': 'West Karbi Anglong',

  /* Existing codes */
  'AS-BRP': 'Barpeta',

  /* Underscore compatibility */
  AS_BAK: 'Baksa',
  AS_BAR: 'Barpeta',
  AS_BIS: 'Biswanath',
  AS_BON: 'Bongaigaon',
  AS_CAC: 'Cachar',
  AS_CHA: 'Charaideo',
  AS_CHH: 'Charaideo',
  AS_DAR: 'Darrang',
  AS_DHE: 'Dhemaji',
  AS_DHU: 'Dhubri',
  AS_DIB: 'Dibrugarh',
  AS_DIM: 'Dima Hasao',
  AS_GOL: 'Golaghat',
  AS_GOA: 'Goalpara',
  AS_HOJ: 'Hojai',
  AS_JOR: 'Jorhat',
  AS_KAM: 'Kamrup',
  AS_KMA: 'Kamrup Metropolitan',
  AS_KAR: 'Karbi Anglong',
  AS_KRI: 'Kokrajhar',
  AS_LAK: 'Lakhimpur',
  AS_MAJ: 'Majuli',
  AS_MOR: 'Morigaon',
  AS_NAG: 'Nagaon',
  AS_NAL: 'Nalbari',
  AS_SIV: 'Sivasagar',
  AS_SON: 'Sonitpur',
  AS_TIN: 'Tinsukia',
  AS_UDL: 'Udalguri',
  AS_WES: 'West Karbi Anglong',

  AS_BRP: 'Barpeta',
};

/* ==========================================================================
   NORMALIZE
   ========================================================================== */

function normalizeName(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /\bdistrict\b/g,
      '',
    )
    .replace(
      /\bmetropolitan\b/g,
      '',
    )
    .replace(
      /\bmetro\b/g,
      '',
    )
    .replace(
      /\bcity\b/g,
      '',
    )
    .replace(
      /[^a-z0-9]/g,
      '',
    );
}

/* ==========================================================================
   BACKEND CODE NAME
   ========================================================================== */

function backendCodeName(
  code: string,
): string {
  return (
    BACKEND_CODE_TO_NAME[
      code
    ] ??
    code
      .replace(
        /^AS[-_]?/i,
        '',
      )
      .replace(
        /[-_]/g,
        ' ',
      )
  );
}

/* ==========================================================================
   GEOJSON DISTRICT NAME
   ========================================================================== */

function getGeoJsonDistrictName(
  feature: GeoFeature,
): string {
  const p =
    feature.properties;

  const value =
    p.district ??
    p.DISTRICT ??
    p.DTNAME ??
    p.name ??
    p.NAME ??
    p.district_name;

  return value
    ? String(value)
    : '';
}

/* ==========================================================================
   MATCH BACKEND DISTRICT TO GEOJSON
   ========================================================================== */

function matchDistrict(
  feature: GeoFeature,
  backendDistricts: District[],
): District | undefined {
  const rawGeoName =
    getGeoJsonDistrictName(
      feature,
    );

  const geoName =
    normalizeName(
      rawGeoName,
    );

  if (!geoName) {
    return undefined;
  }

  for (
    const district of backendDistricts
  ) {
    const backendName =
      normalizeName(
        backendCodeName(
          district.district_code,
        ),
      );

    /* -------------------------------------------------------------- */
    /* exact                                                            */
    /* -------------------------------------------------------------- */

    if (
      geoName ===
      backendName
    ) {
      return district;
    }

    /* -------------------------------------------------------------- */
    /* conservative partial match                                      */
    /* -------------------------------------------------------------- */

    if (
      geoName.includes(
        backendName,
      ) ||
      backendName.includes(
        geoName,
      )
    ) {
      return district;
    }

    /* -------------------------------------------------------------- */
    /* explicit aliases                                                */
    /* -------------------------------------------------------------- */

    const aliases: Record<
      string,
      string[]
    > = {
      'AS-KAM': [
        'kamrup',
        'kamrupmetro',
        'kamrupmetropolitan',
      ],

      'AS-BRP': [
        'barpeta',
      ],

      AS_KAM: [
        'kamrup',
        'kamrupmetro',
        'kamrupmetropolitan',
      ],

      AS_BRP: [
        'barpeta',
      ],
    };

    const districtAliases =
      aliases[
        district.district_code
      ] ?? [];

    if (
      districtAliases.some(
        (alias) =>
          normalizeName(
            alias,
          ) ===
          geoName,
      )
    ) {
      return district;
    }
  }

  return undefined;
}

/* ==========================================================================
   BUILD THREE.JS SHAPES
   ========================================================================== */

function buildShapes(
  geojson: FeatureCollection,
): PreparedFeature[] {
  const projection =
    geoMercator();

  projection.fitSize(
    [
      10,
      7,
    ],
    geojson as never,
  );

  return geojson.features.map(
    (
      feature,
    ) => {
      const geometry =
        feature.geometry;

      const polygons =
        geometry.type ===
        'Polygon'
          ? [
              geometry.coordinates,
            ]
          : geometry.coordinates;

      const result:
        THREE.Shape[][] =
        [];

      for (
        const polygon of
          polygons as unknown[][]
      ) {
        const rings:
          THREE.Shape[] =
          [];

        for (
          const ring of
            polygon as unknown[][]
        ) {
          if (
            ring.length <
            3
          ) {
            continue;
          }

          const shape =
            new THREE.Shape();

          ring.forEach(
            (
              coordinate,
              index,
            ) => {
              const projected =
                projection(
                  coordinate as [
                    number,
                    number,
                  ],
                );

              if (
                !projected
              ) {
                return;
              }

              const x =
                projected[0] -
                5;

              const y =
                -(
                  projected[1] -
                  3.5
                );

              if (
                index ===
                0
              ) {
                shape.moveTo(
                  x,
                  y,
                );
              } else {
                shape.lineTo(
                  x,
                  y,
                );
              }
            },
          );

          shape.closePath();

          rings.push(
            shape,
          );
        }

        if (
          rings.length >
          0
        ) {
          result.push(
            rings,
          );
        }
      }

      return {
        feature,

        name:
          getGeoJsonDistrictName(
            feature,
          ),

        polygons:
          result,
      };
    },
  );
}

/* ==========================================================================
   DISTRICT MESH
   ========================================================================== */

function DistrictMesh({
  feature,
  district,
  maxDisbursement,
  onDistrictSelect,
}: {
  feature: PreparedFeature;

  district:
    | District
    | undefined;

  maxDisbursement: number;

  onDistrictSelect?: (
    districtCode: string,
  ) => void;
}) {
  const [
    hovered,
    setHovered,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------
     FUNDED
     ------------------------------------------------------------------------ */

  const funded =
    Boolean(
      district &&
      (
        district.disbursed_paise >
          0 ||
        district.pending_paise >
          0
      ),
    );

  /* ------------------------------------------------------------------------
     AMOUNT
     ------------------------------------------------------------------------ */

  const amount =
    district?.disbursed_paise ??
    0;

  const ratio =
    maxDisbursement >
    0
      ? Math.min(
          1,
          amount /
            maxDisbursement,
        )
      : 0;

  /* ------------------------------------------------------------------------
     HEIGHT
     ------------------------------------------------------------------------ */

  const baseHeight =
    funded
      ? 0.08 +
        ratio * 0.34
      : 0.035;

  const targetHeight =
    hovered &&
    funded
      ? baseHeight +
        0.065
      : baseHeight;

  /* ------------------------------------------------------------------------
     COLOR
     ------------------------------------------------------------------------ */

  const unfunded =
    new THREE.Color(
      '#D9F1F7',
    );

  const fundedLight =
    new THREE.Color(
      '#79D0F1',
    );

  const fundedDark =
    new THREE.Color(
      '#1769E8',
    );

  let color =
    unfunded.clone();

  if (funded) {
    color =
      fundedLight
        .clone()
        .lerp(
          fundedDark,
          0.22 +
            ratio *
              0.78,
        );
  }

  if (
    hovered &&
    funded
  ) {
    color.lerp(
      new THREE.Color(
        '#43B8FF',
      ),
      0.24,
    );
  }

  /* ------------------------------------------------------------------------
     CLICK
     ------------------------------------------------------------------------ */

  function handleClick() {
    if (
      !district ||
      !funded
    ) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * We no longer navigate to /districts/...
     *
     * The parent page decides what to do.
     */
    onDistrictSelect?.(
      district.district_code,
    );
  }

  return (
    <>
      {feature.polygons.map(
        (
          polygon,
          polygonIndex,
        ) =>
          polygon.map(
            (
              shape,
              shapeIndex,
            ) => {

              const geometry =
                new THREE.ExtrudeGeometry(
                  shape,
                  {
                    depth:
                      targetHeight,

                    bevelEnabled:
                      true,

                    bevelSegments:
                      2,

                    bevelSize:
                      0.012,

                    bevelThickness:
                      0.015,

                    curveSegments:
                      3,
                  },
                );

              return (
                <group
                  key={`${feature.name}-${polygonIndex}-${shapeIndex}`}
                >

                  {/* ==================================================== */}
                  {/* DISTRICT                                               */}
                  {/* ==================================================== */}

                  <mesh
                    geometry={
                      geometry
                    }

                    onPointerEnter={(
                      event,
                    ) => {
                      event.stopPropagation();

                      if (
                        !funded
                      ) {
                        return;
                      }

                      setHovered(
                        true,
                      );

                      document.body.style.cursor =
                        'pointer';
                    }}

                    onPointerLeave={(
                      event,
                    ) => {
                      event.stopPropagation();

                      setHovered(
                        false,
                      );

                      document.body.style.cursor =
                        'default';
                    }}

                    onClick={(
                      event,
                    ) => {
                      event.stopPropagation();

                      handleClick();
                    }}
                  >

                    <meshStandardMaterial
                      color={
                        color
                      }

                      roughness={
                        0.56
                      }

                      metalness={
                        0.04
                      }

                      emissive={
                        funded
                          ? '#0D4C82'
                          : '#000000'
                      }

                      emissiveIntensity={
                        hovered &&
                        funded
                          ? 0.22
                          : funded
                            ? 0.035
                            : 0
                      }

                      side={
                        THREE.DoubleSide
                      }
                    />

                  </mesh>

                  {/* ==================================================== */}
                  {/* BORDER                                                 */}
                  {/* ==================================================== */}

                  <lineSegments
                    position={[
                      0,
                      0,
                      0.01,
                    ]}
                  >

                    <edgesGeometry
                      args={[
                        geometry,
                      ]}
                    />

                    <lineBasicMaterial
                      color={
                        funded
                          ? hovered
                            ? '#1769E8'
                            : '#347EAF'
                          : '#91B6C5'
                      }

                      transparent

                      opacity={
                        funded
                          ? 1
                          : 0.92
                      }
                    />

                  </lineSegments>

                  {/* ==================================================== */}
                  {/* HOVER INFORMATION                                      */}
                  {/* ==================================================== */}

                  {funded &&
                    hovered && (
                      <Html
                        center
                        position={[
                          0,
                          0,
                          targetHeight +
                            0.28,
                        ]}
                        distanceFactor={
                          7
                        }
                        zIndexRange={[
                          100,
                          0,
                        ]}
                        pointerEvents="none"
                      >

                        <div className="map-district-tooltip">

                          <span className="map-tooltip-label">
                            DISTRICT
                          </span>

                          <strong className="map-tooltip-name">
                            {
                              backendCodeName(
                                district!.district_code,
                              )
                            }
                          </strong>

                          <div className="map-tooltip-line" />

                          <div className="map-tooltip-stat">

                            <span>
                              Disbursed
                            </span>

                            <strong>
                              {money(
                                district!
                                  .disbursed_paise,
                              )}
                            </strong>

                          </div>

                          <div className="map-tooltip-stat">

                            <span>
                              Families
                            </span>

                            <strong>
                              {
                                district!
                                  .beneficiary_count
                              }
                            </strong>

                          </div>

                          {district!
                            .pending_paise >
                            0 && (
                            <div className="map-tooltip-stat">

                              <span>
                                Pending
                              </span>

                              <strong>
                                {money(
                                  district!
                                    .pending_paise,
                                )}
                              </strong>

                            </div>
                          )}

                          <div className="map-tooltip-action">
                            Click to view district
                          </div>

                        </div>

                      </Html>
                    )}

                </group>
              );
            },
          ),
      )}
    </>
  );
}

/* ==========================================================================
   SCENE
   ========================================================================== */

function AssamScene({
  geojson,
  districts,
  onDistrictSelect,
}: {
  geojson: FeatureCollection;

  districts: District[];

  onDistrictSelect?: (
    districtCode: string,
  ) => void;
}) {
  const prepared =
    useMemo(
      () =>
        buildShapes(
          geojson,
        ),
      [geojson],
    );

  const maxDisbursement =
    Math.max(
      ...districts.map(
        (
          district,
        ) =>
          district.disbursed_paise,
      ),
      1,
    );

  return (
    <>
      {/* ================================================================ */}
      {/* CAMERA                                                           */}
      {/* ================================================================ */}

      <PerspectiveCamera
        makeDefault
        position={[
          0,
          0,
          30.5,
        ]}
        fov={36}
      />

      {/* ================================================================ */}
      {/* LIGHTING                                                         */}
      {/* ================================================================ */}

      <ambientLight
        intensity={1.8}
      />

      <directionalLight
        position={[
          4,
          6,
          10,
        ]}
        intensity={2.2}
      />

      <directionalLight
        position={[
          -4,
          2,
          5,
        ]}
        intensity={0.75}
        color="#C8EAFF"
      />

      {/* ================================================================ */}
      {/* ASSAM                                                            */}
      {/* ================================================================ */}

      <group
        rotation={[
          THREE.MathUtils.degToRad(
            6,
          ),
          THREE.MathUtils.degToRad(
            -3,
          ),
          0,
        ]}
      >

        {prepared.map(
          (
            feature,
            index,
          ) => {

            const district =
              matchDistrict(
                feature.feature,
                districts,
              );

            return (
              <DistrictMesh
                key={`${feature.name}-${index}`}
                feature={
                  feature
                }
                district={
                  district
                }
                maxDisbursement={
                  maxDisbursement
                }
                onDistrictSelect={
                  onDistrictSelect
                }
              />
            );
          },
        )}

      </group>

      {/* ================================================================ */}
      {/* CONTROLS                                                         */}
      {/* ================================================================ */}

      <OrbitControls
        enablePan={
          false
        }

        enableZoom={
          false
        }

        enableRotate={
          false
        }

        enableDamping

        dampingFactor={
          0.065
        }

        minDistance={
          6.3
        }

        maxDistance={
          13
        }

        minPolarAngle={
          Math.PI / 2.4
        }

        maxPolarAngle={
          Math.PI / 1.65
        }
      />
    </>
  );
}

/* ==========================================================================
   MAIN MAP COMPONENT
   ========================================================================== */

export default function AssamReliefMap({
  districts,
  loading = false,
  onDistrictSelect,
}: Props) {
  const [
    geojson,
    setGeojson,
  ] =
    useState<FeatureCollection | null>(
      null,
    );

  const [
    mapError,
    setMapError,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------
     LOAD GEOJSON
     ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled =
      false;

    async function loadMap() {
      try {
        const response =
          await fetch(
            '/data/assam-districts.geojson',
            {
              cache:
                'no-store',
            },
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `GeoJSON request failed: ${response.status}`,
          );
        }

        const data =
          (await response.json()) as FeatureCollection;

        console.log(
          '[ReliefChain] Assam GeoJSON features:',
          data.features.length,
        );

        if (
          !cancelled
        ) {
          setGeojson(
            data,
          );
        }
      } catch (
        error
      ) {
        console.error(
          '[ReliefChain] Assam map error:',
          error,
        );

        if (
          !cancelled
        ) {
          setMapError(
            true,
          );
        }
      }
    }

    loadMap();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */

  return (
    <section className="assam-map-hero">

      <div className="map-stage">

        {loading ? (
          <div className="map-loading">

            <span className="map-loader" />

            Loading relief data...

          </div>
        ) : mapError ? (
          <div className="map-loading">

            <strong>
              Unable to load Assam map.
            </strong>

            <span>
              Check public/data/assam-districts.geojson
            </span>

          </div>
        ) : !geojson ? (
          <div className="map-loading">

            <span className="map-loader" />

            Loading Assam...

          </div>
        ) : (
          <Canvas
            dpr={[
              1,
              2,
            ]}
            gl={{
              antialias:
                true,
              alpha:
                true,
            }}
          >

            <AssamScene
              geojson={
                geojson
              }

              districts={
                districts
              }

              onDistrictSelect={
                onDistrictSelect
              }
            />

          </Canvas>
        )}

      </div>

    </section>
  );
}