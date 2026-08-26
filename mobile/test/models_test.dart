import 'package:flutter_test/flutter_test.dart';
import 'package:reliefchain/models/auth_tokens.dart';
import 'package:reliefchain/models/beneficiary.dart';
import 'package:reliefchain/models/payment.dart';
import 'package:reliefchain/models/payment_proof.dart';

void main() {
  group('AuthTokens', () {
    test('parses real API auth response', () {
      final tokens = AuthTokens.fromJson({
        'accessToken': 'access-token',
        'refreshToken': 'refresh-token',
        'expiresIn': 900,
      });

      expect(tokens.accessToken, 'access-token');
      expect(tokens.refreshToken, 'refresh-token');
      expect(tokens.expiresIn, 900);
      expect(tokens.canRefresh, isTrue);
    });

    test('parses lightweight demo auth response', () {
      final tokens = AuthTokens.fromJson({'accessToken': 'access-token'});

      expect(tokens.accessToken, 'access-token');
      expect(tokens.refreshToken, isNull);
      expect(tokens.expiresIn, isNull);
      expect(tokens.canRefresh, isFalse);
    });
  });

  group('Beneficiary', () {
    test('parses beneficiary view with nested disbursement payment', () {
      final beneficiary = Beneficiary.fromJson({
        'name': 'Demo Beneficiary',
        'districtCode': 'AS-KAM',
        'schemeName': 'Emergency Cash Support',
        'promisedPaise': 2500000,
        'payments': [
          {
            'public_reference': 'RC-2026-DEMO0001',
            'amount_paise': 2500000,
            'status': 'SETTLED',
            'bank_reference': 'SIMBANK-DEMO1',
            'proof': {
              'transactionId': 'transaction-000000000001',
              'blockNumber': null,
              'committedAt': '2026-01-01T00:00:00.000Z',
              'status': 'VALID',
              'ledgerMode': 'DEMO',
            },
            'created_at': '2026-01-01T00:00:00.000Z',
            'updated_at': '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      expect(beneficiary.districtCode, 'AS-KAM');
      expect(beneficiary.promisedPaise, 2500000);
      expect(beneficiary.payments, hasLength(1));
      expect(beneficiary.payments.first.status, PaymentStatus.settled);
      expect(beneficiary.payments.first.amount, 25000);
      expect(beneficiary.payments.first.proof?.status, LedgerProofStatus.valid);
      expect(beneficiary.payments.first.proof?.isValid, isTrue);
    });

    test('uses an empty payment list when payments are missing', () {
      final beneficiary = Beneficiary.fromJson({
        'name': 'Demo Beneficiary',
        'districtCode': 'AS-KAM',
        'schemeName': 'Emergency Cash Support',
        'promisedPaise': 2500000,
      });

      expect(beneficiary.payments, isEmpty);
    });
  });

  group('Payment', () {
    test('falls back to unknown for unrecognized payment statuses', () {
      final payment = Payment.fromJson({
        'public_reference': 'RC-2026-DEMO0001',
        'amount_paise': 2500000,
        'status': 'NEEDS_REVIEW',
        'bank_reference': null,
        'proof': null,
        'created_at': '2026-01-01T00:00:00.000Z',
        'updated_at': '2026-01-01T00:00:00.000Z',
      });

      expect(payment.status, PaymentStatus.unknown);
    });

    test('serializes nested proof as json', () {
      final payment = Payment(
        publicReference: 'RC-2026-DEMO0001',
        amountPaise: 2500000,
        status: PaymentStatus.settled,
        bankReference: 'SIMBANK-DEMO1',
        proof: PaymentProof(
          transactionId: 'transaction-000000000001',
          committedAt: DateTime.parse('2026-01-01T00:00:00.000Z'),
          status: LedgerProofStatus.valid,
          ledgerMode: 'DEMO',
        ),
        createdAt: DateTime.parse('2026-01-01T00:00:00.000Z'),
        updatedAt: DateTime.parse('2026-01-01T00:00:00.000Z'),
      );

      final json = payment.toJson();

      expect(json['proof'], isA<Map<String, dynamic>>());
      expect(
        (json['proof'] as Map<String, dynamic>)['committedAt'],
        '2026-01-01T00:00:00.000Z',
      );
    });
  });
}
