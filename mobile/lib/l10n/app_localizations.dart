import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
  ];

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @faqPaymentStatusQuestion.
  ///
  /// In en, this message translates to:
  /// **'How do I check my payment status?'**
  String get faqPaymentStatusQuestion;

  /// No description provided for @faqPaymentStatusAnswer.
  ///
  /// In en, this message translates to:
  /// **'Open the Payments section to view your relief payments, their current status, references, and verification information.'**
  String get faqPaymentStatusAnswer;

  /// No description provided for @faqPendingQuestion.
  ///
  /// In en, this message translates to:
  /// **'What does Pending mean?'**
  String get faqPendingQuestion;

  /// No description provided for @faqPendingAnswer.
  ///
  /// In en, this message translates to:
  /// **'Pending means your payment is currently being processed. The status will update once processing is complete.'**
  String get faqPendingAnswer;

  /// No description provided for @faqSettledQuestion.
  ///
  /// In en, this message translates to:
  /// **'What does Settled mean?'**
  String get faqSettledQuestion;

  /// No description provided for @faqSettledAnswer.
  ///
  /// In en, this message translates to:
  /// **'Settled means the payment has been successfully completed.'**
  String get faqSettledAnswer;

  /// No description provided for @faqFailedQuestion.
  ///
  /// In en, this message translates to:
  /// **'What does Failed mean?'**
  String get faqFailedQuestion;

  /// No description provided for @faqFailedAnswer.
  ///
  /// In en, this message translates to:
  /// **'Failed means the payment could not be completed. Check the payment details for more information.'**
  String get faqFailedAnswer;

  /// No description provided for @faqMissingPaymentQuestion.
  ///
  /// In en, this message translates to:
  /// **'Why can\'t I see my payment?'**
  String get faqMissingPaymentQuestion;

  /// No description provided for @faqMissingPaymentAnswer.
  ///
  /// In en, this message translates to:
  /// **'Try refreshing your data. If the payment still does not appear, contact your relief coordinator.'**
  String get faqMissingPaymentAnswer;

  /// No description provided for @receivedPayments.
  ///
  /// In en, this message translates to:
  /// **'Received Payments'**
  String get receivedPayments;

  /// No description provided for @refreshData.
  ///
  /// In en, this message translates to:
  /// **'Refresh Data'**
  String get refreshData;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome'**
  String get welcome;

  /// No description provided for @letsGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Let\'s get started'**
  String get letsGetStarted;

  /// No description provided for @enterMobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number'**
  String get enterMobileNumber;

  /// No description provided for @otpWillBeSent.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send you a 6-digit OTP'**
  String get otpWillBeSent;

  /// No description provided for @mobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get mobileNumber;

  /// No description provided for @continueButton.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueButton;

  /// No description provided for @enterOtp.
  ///
  /// In en, this message translates to:
  /// **'Enter OTP'**
  String get enterOtp;

  /// No description provided for @otpSentTo.
  ///
  /// In en, this message translates to:
  /// **'We\'ve sent a 6-digit code to'**
  String get otpSentTo;

  /// No description provided for @otpExpiresIn.
  ///
  /// In en, this message translates to:
  /// **'OTP expires in {time}'**
  String otpExpiresIn(Object time);

  /// No description provided for @resendOtp.
  ///
  /// In en, this message translates to:
  /// **'Resend OTP'**
  String get resendOtp;

  /// No description provided for @verifyOtp.
  ///
  /// In en, this message translates to:
  /// **'Verify OTP'**
  String get verifyOtp;

  /// No description provided for @choosePreferredLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose your preferred language'**
  String get choosePreferredLanguage;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @hindi.
  ///
  /// In en, this message translates to:
  /// **'Hindi'**
  String get hindi;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @payments.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get payments;

  /// No description provided for @eligibility.
  ///
  /// In en, this message translates to:
  /// **'Eligibility'**
  String get eligibility;

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @helloUser.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String helloUser(Object name);

  /// No description provided for @reliefDashboard.
  ///
  /// In en, this message translates to:
  /// **'Here\'s your relief dashboard'**
  String get reliefDashboard;

  /// No description provided for @eligibilityStatus.
  ///
  /// In en, this message translates to:
  /// **'Eligibility Status'**
  String get eligibilityStatus;

  /// No description provided for @eligible.
  ///
  /// In en, this message translates to:
  /// **'Eligible'**
  String get eligible;

  /// No description provided for @schemeDetails.
  ///
  /// In en, this message translates to:
  /// **'Scheme Details'**
  String get schemeDetails;

  /// No description provided for @schemeName.
  ///
  /// In en, this message translates to:
  /// **'Scheme Name'**
  String get schemeName;

  /// No description provided for @district.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get district;

  /// No description provided for @totalAssistance.
  ///
  /// In en, this message translates to:
  /// **'Total Assistance'**
  String get totalAssistance;

  /// No description provided for @latestPayment.
  ///
  /// In en, this message translates to:
  /// **'Latest Payment'**
  String get latestPayment;

  /// No description provided for @publicReference.
  ///
  /// In en, this message translates to:
  /// **'Public Reference'**
  String get publicReference;

  /// No description provided for @status.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get status;

  /// No description provided for @bankReference.
  ///
  /// In en, this message translates to:
  /// **'Bank Reference'**
  String get bankReference;

  /// No description provided for @createdOn.
  ///
  /// In en, this message translates to:
  /// **'Created On'**
  String get createdOn;

  /// No description provided for @lastUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last Updated'**
  String get lastUpdated;

  /// No description provided for @verification.
  ///
  /// In en, this message translates to:
  /// **'Verification'**
  String get verification;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get quickActions;

  /// No description provided for @received.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get received;

  /// No description provided for @pending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pending;

  /// No description provided for @failed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get failed;

  /// No description provided for @reversed.
  ///
  /// In en, this message translates to:
  /// **'Reversed'**
  String get reversed;

  /// No description provided for @unknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get unknown;

  /// No description provided for @updates.
  ///
  /// In en, this message translates to:
  /// **'Updates'**
  String get updates;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get help;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @beneficiary.
  ///
  /// In en, this message translates to:
  /// **'Beneficiary'**
  String get beneficiary;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @privacyInformation.
  ///
  /// In en, this message translates to:
  /// **'Privacy Information'**
  String get privacyInformation;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @helpSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & Support'**
  String get helpSupport;

  /// No description provided for @aboutReliefChain.
  ///
  /// In en, this message translates to:
  /// **'About ReliefChain'**
  String get aboutReliefChain;

  /// No description provided for @noPaymentInformation.
  ///
  /// In en, this message translates to:
  /// **'No payment information available.'**
  String get noPaymentInformation;

  /// No description provided for @noEligibilityInformation.
  ///
  /// In en, this message translates to:
  /// **'No eligibility information available.'**
  String get noEligibilityInformation;

  /// No description provided for @noProfileInformation.
  ///
  /// In en, this message translates to:
  /// **'No profile information available.'**
  String get noProfileInformation;

  /// No description provided for @noBeneficiaryData.
  ///
  /// In en, this message translates to:
  /// **'No beneficiary data available.'**
  String get noBeneficiaryData;

  /// No description provided for @noPaymentsRecorded.
  ///
  /// In en, this message translates to:
  /// **'No payments have been recorded yet.'**
  String get noPaymentsRecorded;

  /// No description provided for @noReceivedPayments.
  ///
  /// In en, this message translates to:
  /// **'No received payments.'**
  String get noReceivedPayments;

  /// No description provided for @noPendingPayments.
  ///
  /// In en, this message translates to:
  /// **'No pending payments.'**
  String get noPendingPayments;

  /// No description provided for @noFailedPayments.
  ///
  /// In en, this message translates to:
  /// **'No failed payments.'**
  String get noFailedPayments;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @youAreEligible.
  ///
  /// In en, this message translates to:
  /// **'You are Eligible'**
  String get youAreEligible;

  /// No description provided for @reliefInformationAvailable.
  ///
  /// In en, this message translates to:
  /// **'Your relief information is available for this scheme.'**
  String get reliefInformationAvailable;

  /// No description provided for @eligibilityVerificationNote.
  ///
  /// In en, this message translates to:
  /// **'Eligibility is subject to verification and applicable government guidelines.'**
  String get eligibilityVerificationNote;

  /// No description provided for @yourPaymentHistory.
  ///
  /// In en, this message translates to:
  /// **'Your payment history.'**
  String get yourPaymentHistory;

  /// No description provided for @receivedSettledPayments.
  ///
  /// In en, this message translates to:
  /// **'You have received {amount} in settled relief payments.'**
  String receivedSettledPayments(Object amount);

  /// No description provided for @paymentStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Your payment is being processed. We will notify you once it is completed.'**
  String get paymentStatusPending;

  /// No description provided for @paymentStatusSettled.
  ///
  /// In en, this message translates to:
  /// **'Your payment has been successfully completed.'**
  String get paymentStatusSettled;

  /// No description provided for @paymentStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'This payment could not be completed.'**
  String get paymentStatusFailed;

  /// No description provided for @paymentStatusReversed.
  ///
  /// In en, this message translates to:
  /// **'This payment has been reversed.'**
  String get paymentStatusReversed;

  /// No description provided for @paymentStatusUnknown.
  ///
  /// In en, this message translates to:
  /// **'The current payment status could not be confirmed.'**
  String get paymentStatusUnknown;

  /// No description provided for @transactionSecure.
  ///
  /// In en, this message translates to:
  /// **'This transaction is secure and recorded on the ReliefChain ledger.'**
  String get transactionSecure;

  /// No description provided for @ledgerProofUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Ledger proof is currently unavailable for this transaction.'**
  String get ledgerProofUnavailable;

  /// No description provided for @settingsAccessibility.
  ///
  /// In en, this message translates to:
  /// **'Accessibility'**
  String get settingsAccessibility;

  /// No description provided for @textToSpeech.
  ///
  /// In en, this message translates to:
  /// **'Text-to-Speech'**
  String get textToSpeech;

  /// No description provided for @readImportantInformation.
  ///
  /// In en, this message translates to:
  /// **'Read important information aloud'**
  String get readImportantInformation;

  /// No description provided for @largerText.
  ///
  /// In en, this message translates to:
  /// **'Larger Text'**
  String get largerText;

  /// No description provided for @useLargerText.
  ///
  /// In en, this message translates to:
  /// **'Use larger text across the app'**
  String get useLargerText;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacy;

  /// No description provided for @privacyMessage.
  ///
  /// In en, this message translates to:
  /// **'ReliefChain only displays the beneficiary information required to show relief eligibility and payment status. Sensitive credentials and authentication tokens are not displayed here.'**
  String get privacyMessage;

  /// No description provided for @helpIntroduction.
  ///
  /// In en, this message translates to:
  /// **'Find answers to common questions about your relief eligibility and payments.'**
  String get helpIntroduction;

  /// No description provided for @commonQuestions.
  ///
  /// In en, this message translates to:
  /// **'Common Questions'**
  String get commonQuestions;

  /// No description provided for @needMoreHelp.
  ///
  /// In en, this message translates to:
  /// **'Need more help?'**
  String get needMoreHelp;

  /// No description provided for @reliefCoordinator.
  ///
  /// In en, this message translates to:
  /// **'Relief Coordinator'**
  String get reliefCoordinator;

  /// No description provided for @contactReliefCoordinator.
  ///
  /// In en, this message translates to:
  /// **'Contact your local relief coordinator for assistance.'**
  String get contactReliefCoordinator;

  /// No description provided for @whatIsReliefChain.
  ///
  /// In en, this message translates to:
  /// **'What is ReliefChain?'**
  String get whatIsReliefChain;

  /// No description provided for @reliefChainDescription.
  ///
  /// In en, this message translates to:
  /// **'ReliefChain helps beneficiaries view their relief scheme information, payment status, and payment verification details in one place.'**
  String get reliefChainDescription;

  /// No description provided for @transparency.
  ///
  /// In en, this message translates to:
  /// **'Transparency'**
  String get transparency;

  /// No description provided for @transparencyDescription.
  ///
  /// In en, this message translates to:
  /// **'Payment records can include public references and ledger proof so beneficiaries can better understand and verify their relief payments.'**
  String get transparencyDescription;

  /// No description provided for @privacySection.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacySection;

  /// No description provided for @privacyDescription.
  ///
  /// In en, this message translates to:
  /// **'The app only displays the beneficiary information needed to provide relief status and payment information. Authentication credentials are kept private.'**
  String get privacyDescription;

  /// No description provided for @directAidTransparentImpact.
  ///
  /// In en, this message translates to:
  /// **'Direct aid. Transparent impact.'**
  String get directAidTransparentImpact;

  /// No description provided for @version.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String version(Object version);

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @scheme.
  ///
  /// In en, this message translates to:
  /// **'Scheme'**
  String get scheme;

  /// No description provided for @promisedAid.
  ///
  /// In en, this message translates to:
  /// **'Promised Aid'**
  String get promisedAid;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
