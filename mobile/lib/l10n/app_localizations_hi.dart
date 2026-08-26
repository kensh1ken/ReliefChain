// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get all => 'सभी';

  @override
  String get close => 'बंद करें';

  @override
  String get faqPaymentStatusQuestion =>
      'मैं अपने भुगतान की स्थिति कैसे देखूं?';

  @override
  String get faqPaymentStatusAnswer =>
      'अपने राहत भुगतानों, उनकी वर्तमान स्थिति, संदर्भ और सत्यापन जानकारी देखने के लिए भुगतान अनुभाग खोलें।';

  @override
  String get faqPendingQuestion => 'लंबित का क्या अर्थ है?';

  @override
  String get faqPendingAnswer =>
      'लंबित का अर्थ है कि आपका भुगतान अभी संसाधित किया जा रहा है। प्रक्रिया पूरी होने के बाद स्थिति अपडेट हो जाएगी।';

  @override
  String get faqSettledQuestion => 'प्राप्त का क्या अर्थ है?';

  @override
  String get faqSettledAnswer =>
      'प्राप्त का अर्थ है कि भुगतान सफलतापूर्वक पूरा हो गया है।';

  @override
  String get faqFailedQuestion => 'विफल का क्या अर्थ है?';

  @override
  String get faqFailedAnswer =>
      'विफल का अर्थ है कि भुगतान पूरा नहीं हो सका। अधिक जानकारी के लिए भुगतान विवरण देखें।';

  @override
  String get faqMissingPaymentQuestion =>
      'मुझे अपना भुगतान क्यों नहीं दिखाई दे रहा है?';

  @override
  String get faqMissingPaymentAnswer =>
      'अपना डेटा रीफ़्रेश करने का प्रयास करें। यदि भुगतान फिर भी दिखाई नहीं देता है, तो अपने राहत समन्वयक से संपर्क करें।';

  @override
  String get receivedPayments => 'Received Payments';

  @override
  String get refreshData => 'डेटा रीफ़्रेश करें';

  @override
  String get welcome => 'स्वागत है';

  @override
  String get letsGetStarted => 'चलिए शुरू करते हैं';

  @override
  String get enterMobileNumber => 'अपना मोबाइल नंबर दर्ज करें';

  @override
  String get otpWillBeSent => 'हम आपको 6 अंकों का OTP भेजेंगे';

  @override
  String get mobileNumber => 'मोबाइल नंबर';

  @override
  String get continueButton => 'जारी रखें';

  @override
  String get enterOtp => 'OTP दर्ज करें';

  @override
  String get otpSentTo => 'हमने 6 अंकों का कोड भेजा है';

  @override
  String otpExpiresIn(Object time) {
    return 'OTP $time में समाप्त हो जाएगा';
  }

  @override
  String get resendOtp => 'OTP दोबारा भेजें';

  @override
  String get verifyOtp => 'OTP सत्यापित करें';

  @override
  String get choosePreferredLanguage => 'अपनी पसंदीदा भाषा चुनें';

  @override
  String get english => 'अंग्रेज़ी';

  @override
  String get hindi => 'हिंदी';

  @override
  String get home => 'होम';

  @override
  String get payments => 'भुगतान';

  @override
  String get eligibility => 'पात्रता';

  @override
  String get more => 'अधिक';

  @override
  String helloUser(Object name) {
    return 'नमस्ते, $name';
  }

  @override
  String get reliefDashboard => 'यह आपका राहत डैशबोर्ड है';

  @override
  String get eligibilityStatus => 'पात्रता स्थिति';

  @override
  String get eligible => 'पात्र';

  @override
  String get schemeDetails => 'योजना का विवरण';

  @override
  String get schemeName => 'योजना का नाम';

  @override
  String get district => 'जिला';

  @override
  String get totalAssistance => 'कुल सहायता';

  @override
  String get latestPayment => 'नवीनतम भुगतान';

  @override
  String get publicReference => 'सार्वजनिक संदर्भ';

  @override
  String get status => 'स्थिति';

  @override
  String get bankReference => 'बैंक संदर्भ';

  @override
  String get createdOn => 'बनाया गया';

  @override
  String get lastUpdated => 'अंतिम अपडेट';

  @override
  String get verification => 'सत्यापन';

  @override
  String get quickActions => 'त्वरित कार्य';

  @override
  String get received => 'प्राप्त';

  @override
  String get pending => 'लंबित';

  @override
  String get failed => 'विफल';

  @override
  String get reversed => 'वापस किया गया';

  @override
  String get unknown => 'अज्ञात';

  @override
  String get updates => 'अपडेट';

  @override
  String get help => 'सहायता';

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get beneficiary => 'लाभार्थी';

  @override
  String get settings => 'सेटिंग्स';

  @override
  String get language => 'भाषा';

  @override
  String get privacyInformation => 'गोपनीयता जानकारी';

  @override
  String get logout => 'लॉग आउट';

  @override
  String get helpSupport => 'सहायता और समर्थन';

  @override
  String get aboutReliefChain => 'ReliefChain के बारे में';

  @override
  String get noPaymentInformation => 'भुगतान की कोई जानकारी उपलब्ध नहीं है।';

  @override
  String get noEligibilityInformation =>
      'पात्रता की कोई जानकारी उपलब्ध नहीं है।';

  @override
  String get noProfileInformation => 'प्रोफ़ाइल की कोई जानकारी उपलब्ध नहीं है।';

  @override
  String get noBeneficiaryData => 'लाभार्थी का कोई डेटा उपलब्ध नहीं है।';

  @override
  String get noPaymentsRecorded => 'अभी तक कोई भुगतान दर्ज नहीं किया गया है।';

  @override
  String get noReceivedPayments => 'कोई प्राप्त भुगतान नहीं है।';

  @override
  String get noPendingPayments => 'कोई लंबित भुगतान नहीं है।';

  @override
  String get noFailedPayments => 'कोई विफल भुगतान नहीं है।';

  @override
  String get retry => 'पुनः प्रयास करें';

  @override
  String get youAreEligible => 'आप पात्र हैं';

  @override
  String get reliefInformationAvailable =>
      'इस योजना के लिए आपकी राहत जानकारी उपलब्ध है।';

  @override
  String get eligibilityVerificationNote =>
      'पात्रता सत्यापन और लागू सरकारी दिशानिर्देशों के अधीन है।';

  @override
  String get yourPaymentHistory => 'आपका भुगतान इतिहास।';

  @override
  String receivedSettledPayments(Object amount) {
    return 'आपको $amount का निपटान किया गया राहत भुगतान प्राप्त हुआ है।';
  }

  @override
  String get paymentStatusPending =>
      'आपका भुगतान संसाधित किया जा रहा है। पूरा होने पर आपको सूचित किया जाएगा।';

  @override
  String get paymentStatusSettled => 'आपका भुगतान सफलतापूर्वक पूरा हो गया है।';

  @override
  String get paymentStatusFailed => 'यह भुगतान पूरा नहीं हो सका।';

  @override
  String get paymentStatusReversed => 'यह भुगतान वापस कर दिया गया है।';

  @override
  String get paymentStatusUnknown =>
      'वर्तमान भुगतान स्थिति की पुष्टि नहीं हो सकी।';

  @override
  String get transactionSecure =>
      'यह लेनदेन सुरक्षित है और ReliefChain लेजर पर दर्ज है।';

  @override
  String get ledgerProofUnavailable =>
      'इस लेनदेन के लिए लेजर प्रमाण अभी उपलब्ध नहीं है।';

  @override
  String get settingsAccessibility => 'सुलभता';

  @override
  String get textToSpeech => 'टेक्स्ट-टू-स्पीच';

  @override
  String get readImportantInformation => 'महत्वपूर्ण जानकारी ज़ोर से पढ़ें';

  @override
  String get largerText => 'बड़ा टेक्स्ट';

  @override
  String get useLargerText => 'पूरे ऐप में बड़ा टेक्स्ट इस्तेमाल करें';

  @override
  String get privacy => 'गोपनीयता';

  @override
  String get privacyMessage =>
      'ReliefChain केवल राहत पात्रता और भुगतान स्थिति दिखाने के लिए आवश्यक लाभार्थी जानकारी प्रदर्शित करता है। संवेदनशील क्रेडेंशियल और प्रमाणीकरण टोकन यहां प्रदर्शित नहीं किए जाते हैं।';

  @override
  String get helpIntroduction =>
      'अपनी राहत पात्रता और भुगतानों से जुड़े सामान्य प्रश्नों के उत्तर पाएं।';

  @override
  String get commonQuestions => 'सामान्य प्रश्न';

  @override
  String get needMoreHelp => 'अधिक सहायता चाहिए?';

  @override
  String get reliefCoordinator => 'राहत समन्वयक';

  @override
  String get contactReliefCoordinator =>
      'सहायता के लिए अपने स्थानीय राहत समन्वयक से संपर्क करें।';

  @override
  String get whatIsReliefChain => 'ReliefChain क्या है?';

  @override
  String get reliefChainDescription =>
      'ReliefChain लाभार्थियों को उनकी राहत योजना की जानकारी, भुगतान स्थिति और भुगतान सत्यापन विवरण एक ही स्थान पर देखने में मदद करता है।';

  @override
  String get transparency => 'पारदर्शिता';

  @override
  String get transparencyDescription =>
      'भुगतान रिकॉर्ड में सार्वजनिक संदर्भ और लेजर प्रमाण शामिल हो सकते हैं, जिससे लाभार्थी अपने राहत भुगतानों को बेहतर ढंग से समझ और सत्यापित कर सकते हैं।';

  @override
  String get privacySection => 'गोपनीयता';

  @override
  String get privacyDescription =>
      'ऐप केवल राहत स्थिति और भुगतान जानकारी प्रदान करने के लिए आवश्यक लाभार्थी जानकारी प्रदर्शित करता है। प्रमाणीकरण क्रेडेंशियल निजी रखे जाते हैं।';

  @override
  String get directAidTransparentImpact => 'सीधी सहायता। पारदर्शी प्रभाव।';

  @override
  String version(Object version) {
    return 'संस्करण $version';
  }

  @override
  String get name => 'नाम';

  @override
  String get scheme => 'योजना';

  @override
  String get promisedAid => 'वादा की गई सहायता';
}
