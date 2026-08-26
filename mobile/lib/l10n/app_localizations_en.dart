// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get all => 'All';

  @override
  String get close => 'Close';

  @override
  String get faqPaymentStatusQuestion => 'How do I check my payment status?';

  @override
  String get faqPaymentStatusAnswer =>
      'Open the Payments section to view your relief payments, their current status, references, and verification information.';

  @override
  String get faqPendingQuestion => 'What does Pending mean?';

  @override
  String get faqPendingAnswer =>
      'Pending means your payment is currently being processed. The status will update once processing is complete.';

  @override
  String get faqSettledQuestion => 'What does Settled mean?';

  @override
  String get faqSettledAnswer =>
      'Settled means the payment has been successfully completed.';

  @override
  String get faqFailedQuestion => 'What does Failed mean?';

  @override
  String get faqFailedAnswer =>
      'Failed means the payment could not be completed. Check the payment details for more information.';

  @override
  String get faqMissingPaymentQuestion => 'Why can\'t I see my payment?';

  @override
  String get faqMissingPaymentAnswer =>
      'Try refreshing your data. If the payment still does not appear, contact your relief coordinator.';

  @override
  String get receivedPayments => 'Received Payments';

  @override
  String get refreshData => 'Refresh Data';

  @override
  String get welcome => 'Welcome';

  @override
  String get letsGetStarted => 'Let\'s get started';

  @override
  String get enterMobileNumber => 'Enter your mobile number';

  @override
  String get otpWillBeSent => 'We\'ll send you a 6-digit OTP';

  @override
  String get mobileNumber => 'Mobile number';

  @override
  String get continueButton => 'Continue';

  @override
  String get enterOtp => 'Enter OTP';

  @override
  String get otpSentTo => 'We\'ve sent a 6-digit code to';

  @override
  String otpExpiresIn(Object time) {
    return 'OTP expires in $time';
  }

  @override
  String get resendOtp => 'Resend OTP';

  @override
  String get verifyOtp => 'Verify OTP';

  @override
  String get choosePreferredLanguage => 'Choose your preferred language';

  @override
  String get english => 'English';

  @override
  String get hindi => 'Hindi';

  @override
  String get home => 'Home';

  @override
  String get payments => 'Payments';

  @override
  String get eligibility => 'Eligibility';

  @override
  String get more => 'More';

  @override
  String helloUser(Object name) {
    return 'Hello, $name';
  }

  @override
  String get reliefDashboard => 'Here\'s your relief dashboard';

  @override
  String get eligibilityStatus => 'Eligibility Status';

  @override
  String get eligible => 'Eligible';

  @override
  String get schemeDetails => 'Scheme Details';

  @override
  String get schemeName => 'Scheme Name';

  @override
  String get district => 'District';

  @override
  String get totalAssistance => 'Total Assistance';

  @override
  String get latestPayment => 'Latest Payment';

  @override
  String get publicReference => 'Public Reference';

  @override
  String get status => 'Status';

  @override
  String get bankReference => 'Bank Reference';

  @override
  String get createdOn => 'Created On';

  @override
  String get lastUpdated => 'Last Updated';

  @override
  String get verification => 'Verification';

  @override
  String get quickActions => 'Quick Actions';

  @override
  String get received => 'Received';

  @override
  String get pending => 'Pending';

  @override
  String get failed => 'Failed';

  @override
  String get reversed => 'Reversed';

  @override
  String get unknown => 'Unknown';

  @override
  String get updates => 'Updates';

  @override
  String get help => 'Help';

  @override
  String get profile => 'Profile';

  @override
  String get beneficiary => 'Beneficiary';

  @override
  String get settings => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get privacyInformation => 'Privacy Information';

  @override
  String get logout => 'Logout';

  @override
  String get helpSupport => 'Help & Support';

  @override
  String get aboutReliefChain => 'About ReliefChain';

  @override
  String get noPaymentInformation => 'No payment information available.';

  @override
  String get noEligibilityInformation =>
      'No eligibility information available.';

  @override
  String get noProfileInformation => 'No profile information available.';

  @override
  String get noBeneficiaryData => 'No beneficiary data available.';

  @override
  String get noPaymentsRecorded => 'No payments have been recorded yet.';

  @override
  String get noReceivedPayments => 'No received payments.';

  @override
  String get noPendingPayments => 'No pending payments.';

  @override
  String get noFailedPayments => 'No failed payments.';

  @override
  String get retry => 'Retry';

  @override
  String get youAreEligible => 'You are Eligible';

  @override
  String get reliefInformationAvailable =>
      'Your relief information is available for this scheme.';

  @override
  String get eligibilityVerificationNote =>
      'Eligibility is subject to verification and applicable government guidelines.';

  @override
  String get yourPaymentHistory => 'Your payment history.';

  @override
  String receivedSettledPayments(Object amount) {
    return 'You have received $amount in settled relief payments.';
  }

  @override
  String get paymentStatusPending =>
      'Your payment is being processed. We will notify you once it is completed.';

  @override
  String get paymentStatusSettled =>
      'Your payment has been successfully completed.';

  @override
  String get paymentStatusFailed => 'This payment could not be completed.';

  @override
  String get paymentStatusReversed => 'This payment has been reversed.';

  @override
  String get paymentStatusUnknown =>
      'The current payment status could not be confirmed.';

  @override
  String get transactionSecure =>
      'This transaction is secure and recorded on the ReliefChain ledger.';

  @override
  String get ledgerProofUnavailable =>
      'Ledger proof is currently unavailable for this transaction.';

  @override
  String get settingsAccessibility => 'Accessibility';

  @override
  String get textToSpeech => 'Text-to-Speech';

  @override
  String get readImportantInformation => 'Read important information aloud';

  @override
  String get largerText => 'Larger Text';

  @override
  String get useLargerText => 'Use larger text across the app';

  @override
  String get privacy => 'Privacy';

  @override
  String get privacyMessage =>
      'ReliefChain only displays the beneficiary information required to show relief eligibility and payment status. Sensitive credentials and authentication tokens are not displayed here.';

  @override
  String get helpIntroduction =>
      'Find answers to common questions about your relief eligibility and payments.';

  @override
  String get commonQuestions => 'Common Questions';

  @override
  String get needMoreHelp => 'Need more help?';

  @override
  String get reliefCoordinator => 'Relief Coordinator';

  @override
  String get contactReliefCoordinator =>
      'Contact your local relief coordinator for assistance.';

  @override
  String get whatIsReliefChain => 'What is ReliefChain?';

  @override
  String get reliefChainDescription =>
      'ReliefChain helps beneficiaries view their relief scheme information, payment status, and payment verification details in one place.';

  @override
  String get transparency => 'Transparency';

  @override
  String get transparencyDescription =>
      'Payment records can include public references and ledger proof so beneficiaries can better understand and verify their relief payments.';

  @override
  String get privacySection => 'Privacy';

  @override
  String get privacyDescription =>
      'The app only displays the beneficiary information needed to provide relief status and payment information. Authentication credentials are kept private.';

  @override
  String get directAidTransparentImpact => 'Direct aid. Transparent impact.';

  @override
  String version(Object version) {
    return 'Version $version';
  }

  @override
  String get name => 'Name';

  @override
  String get scheme => 'Scheme';

  @override
  String get promisedAid => 'Promised Aid';
}
