import 'package:flutter_test/flutter_test.dart';
import 'package:reliefchain_beneficiary/main.dart';
void main(){testWidgets('shows beneficiary login and language switch',(tester)async{await tester.pumpWidget(const ReliefChainApp());expect(find.text('Check your relief payment'),findsOneWidget);expect(find.text('हिन्दी'),findsOneWidget);});}
