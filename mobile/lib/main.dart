import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000/api/v1');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ReliefChainApp());
}

class Words {
  final bool hindi;
  const Words(this.hindi);
  String get app => hindi ? 'रिलीफचेन' : 'ReliefChain';
  String get tagline => hindi ? 'आपकी सहायता, सत्यापित' : 'Your relief, verified';
  String get welcome => hindi ? 'अपनी सहायता राशि देखें' : 'Check your relief payment';
  String get phone => hindi ? 'पंजीकृत मोबाइल नंबर' : 'Registered mobile number';
  String get send => hindi ? 'ओटीपी भेजें' : 'Send secure code';
  String get otp => hindi ? '6 अंकों का ओटीपी' : '6-digit OTP';
  String get verify => hindi ? 'सत्यापित करें' : 'Verify and continue';
  String get hint => hindi ? 'डेमो संचालक से कोड प्राप्त करें।' : 'Get the demo code from the facilitator.';
  String get status => hindi ? 'भुगतान की स्थिति' : 'Payment status';
  String get promised => hindi ? 'स्वीकृत सहायता' : 'Promised aid';
  String get history => hindi ? 'भुगतान इतिहास' : 'Payment history';
  String get proof => hindi ? 'ब्लॉकचेन प्रमाण' : 'Blockchain proof';
  String get read => hindi ? 'सुनें' : 'Read aloud';
  String get offline => hindi ? 'पिछली सुरक्षित जानकारी दिखाई गई है' : 'Showing the last securely cached result';
  String get private => hindi ? 'आपका आधार और फ़ोन ब्लॉकचेन पर संग्रहीत नहीं है।' : 'Your Aadhaar and phone are never stored on the blockchain.';
  String state(String value) => switch(value) {
    'SETTLED' => hindi ? 'भुगतान पूरा हुआ' : 'Payment completed',
    'FAILED' => hindi ? 'भुगतान पर ध्यान आवश्यक है' : 'Payment needs attention',
    'REVERSED' => hindi ? 'भुगतान वापस लिया गया' : 'Payment reversed',
    _ => hindi ? 'भुगतान प्रक्रिया में है' : 'Payment is being processed'
  };
}

class ReliefChainApp extends StatefulWidget { const ReliefChainApp({super.key}); @override State<ReliefChainApp> createState()=>_ReliefChainAppState(); }
class _ReliefChainAppState extends State<ReliefChainApp> {
  bool hindi=false;
  @override Widget build(BuildContext context)=>MaterialApp(debugShowCheckedModeBanner:false,title:'ReliefChain',theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff0c6b53),surface:const Color(0xfffffdf8)),scaffoldBackgroundColor:const Color(0xfff5f3ec),useMaterial3:true,fontFamily:'sans'),home:LoginScreen(words:Words(hindi),toggle:()=>setState(()=>hindi=!hindi)));
}

class Api {
  static const storage=FlutterSecureStorage();
  static Future<void> requestOtp(String phone)=>_post('/auth/otp/request',{'phone':phone});
  static Future<void> verifyOtp(String phone,String otp) async { final data=await _post('/auth/otp/verify',{'phone':phone,'otp':otp});await storage.write(key:'token',value:data['accessToken'] as String); }
  static Future<Map<String,dynamic>> me() async {final token=await storage.read(key:'token');final response=await http.get(Uri.parse('$apiBase/beneficiary/me'),headers:{'Authorization':'Bearer $token'}).timeout(const Duration(seconds:10));if(response.statusCode!=200)throw Exception('Unable to load status');return jsonDecode(response.body) as Map<String,dynamic>;}
  static Future<Map<String,dynamic>> _post(String path,Map<String,dynamic> body) async {final response=await http.post(Uri.parse('$apiBase$path'),headers:{'Content-Type':'application/json'},body:jsonEncode(body)).timeout(const Duration(seconds:10));final data=jsonDecode(response.body) as Map<String,dynamic>;if(response.statusCode>=400)throw Exception(data['message']??'Request failed');return data;}
}

class LoginScreen extends StatefulWidget { final Words words;final VoidCallback toggle;const LoginScreen({super.key,required this.words,required this.toggle});@override State<LoginScreen> createState()=>_LoginScreenState(); }
class _LoginScreenState extends State<LoginScreen> {
  final phone=TextEditingController(),otp=TextEditingController();bool sent=false,busy=false;String? error;
  Future<void> action() async {setState((){busy=true;error=null;});try{if(!sent){await Api.requestOtp(phone.text);setState(()=>sent=true);}else{await Api.verifyOtp(phone.text,otp.text);if(mounted)Navigator.of(context).pushReplacement(MaterialPageRoute(builder:(_)=>StatusScreen(words:widget.words,toggle:widget.toggle)));}}catch(e){setState(()=>error=e.toString().replaceFirst('Exception: ',''));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context){final w=widget.words;return Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(padding:const EdgeInsets.all(24),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:460),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[_Brand(w.app),TextButton.icon(onPressed:widget.toggle,icon:const Icon(Icons.translate),label:Text(w.hindi?'English':'हिन्दी'))]),const SizedBox(height:56),Container(width:68,height:68,decoration:BoxDecoration(color:const Color(0xffdff3e8),borderRadius:BorderRadius.circular(22)),child:const Icon(Icons.verified_user_outlined,size:36,color:Color(0xff0c6b53))),const SizedBox(height:24),Text(w.welcome,style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:8),Text(w.tagline,style:const TextStyle(color:Color(0xff58716d),fontSize:17)),const SizedBox(height:30),TextField(controller:phone,enabled:!sent,keyboardType:TextInputType.phone,decoration:InputDecoration(labelText:w.phone,prefixIcon:const Icon(Icons.phone_android),filled:true,border:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:BorderSide.none))),if(sent)...[const SizedBox(height:16),TextField(controller:otp,keyboardType:TextInputType.number,inputFormatters:[FilteringTextInputFormatter.digitsOnly,LengthLimitingTextInputFormatter(6)],decoration:InputDecoration(labelText:w.otp,prefixIcon:const Icon(Icons.lock_outline),filled:true,border:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:BorderSide.none))),Padding(padding:const EdgeInsets.only(top:8),child:Text(w.hint,style:const TextStyle(color:Color(0xff58716d))))],if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:const TextStyle(color:Colors.red))),const SizedBox(height:20),FilledButton.icon(onPressed:busy?null:action,icon:Icon(sent?Icons.verified_outlined:Icons.sms_outlined),label:Padding(padding:const EdgeInsets.symmetric(vertical:15),child:Text(busy?'…':sent?w.verify:w.send))),const SizedBox(height:30),_PrivacyNote(w.private)]))))));}
}

class StatusScreen extends StatefulWidget {final Words words;final VoidCallback toggle;const StatusScreen({super.key,required this.words,required this.toggle});@override State<StatusScreen> createState()=>_StatusScreenState();}
class _StatusScreenState extends State<StatusScreen>{Map<String,dynamic>?data;bool cached=false;String?error;final tts=FlutterTts();@override void initState(){super.initState();load();}Future<void> load()async{final prefs=await SharedPreferences.getInstance();try{final fresh=await Api.me();await prefs.setString('last-status',jsonEncode(fresh));setState((){data=fresh;cached=false;});}catch(e){final value=prefs.getString('last-status');setState((){if(value!=null){data=jsonDecode(value);cached=true;}else{error=e.toString();}});}}String money(num p)=>'₹${(p/100).toStringAsFixed(0)}';Future<void>speak()async{final list=data?['payments'] as List?;final payment=list!=null&&list.isNotEmpty?list.first as Map<String,dynamic>:null;await tts.setLanguage(widget.words.hindi?'hi-IN':'en-IN');await tts.speak('${widget.words.status}. ${widget.words.state(payment?['status']??'PENDING')}. ${widget.words.promised} ${money(data?['promisedPaise']??0)}');}@override Widget build(BuildContext context){final w=widget.words;if(data==null)return Scaffold(body:Center(child:error==null?const CircularProgressIndicator():Text(error!)));final payments=(data!['payments'] as List<dynamic>);final latest=payments.isEmpty?null:payments.first as Map<String,dynamic>;final state=latest?['status']??'PENDING';final settled=state=='SETTLED';return Scaffold(appBar:AppBar(backgroundColor:Colors.transparent,title:_Brand(w.app),actions:[TextButton.icon(onPressed:widget.toggle,icon:const Icon(Icons.translate),label:Text(w.hindi?'EN':'हिन्दी')),const SizedBox(width:8)]),body:RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(20),children:[if(cached)Container(padding:const EdgeInsets.all(12),margin:const EdgeInsets.only(bottom:12),decoration:BoxDecoration(color:const Color(0xffffedcf),borderRadius:BorderRadius.circular(12)),child:Text(w.offline)),Container(padding:const EdgeInsets.all(24),decoration:BoxDecoration(gradient:LinearGradient(colors:settled?[const Color(0xff0c6b53),const Color(0xff17473e)]:[const Color(0xffa66522),const Color(0xff754113)]),borderRadius:BorderRadius.circular(24)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(settled?Icons.check_circle:Icons.schedule,color:Colors.white,size:44),const SizedBox(height:18),Text(w.state(state),style:const TextStyle(color:Colors.white,fontSize:24,fontWeight:FontWeight.w800)),const SizedBox(height:8),Text('${data!['schemeName']} · ${data!['districtCode']}',style:const TextStyle(color:Color(0xddffffff))),const SizedBox(height:24),Text(w.promised,style:const TextStyle(color:Color(0xbbffffff))),Text(money(data!['promisedPaise']),style:const TextStyle(color:Colors.white,fontSize:34,fontWeight:FontWeight.w800))])),const SizedBox(height:14),OutlinedButton.icon(onPressed:speak,icon:const Icon(Icons.volume_up_outlined),label:Text(w.read)),const SizedBox(height:24),Text(w.history,style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:12),...payments.map((raw){final p=raw as Map<String,dynamic>;return Card(margin:const EdgeInsets.only(bottom:12),child:Padding(padding:const EdgeInsets.all(17),child:Row(children:[CircleAvatar(backgroundColor:const Color(0xffdff3e8),child:Icon(p['status']=='SETTLED'?Icons.done:Icons.info_outline,color:const Color(0xff0c6b53))),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(money(p['amount_paise']),style:const TextStyle(fontWeight:FontWeight.w800,fontSize:17)),Text(w.state(p['status']),style:const TextStyle(color:Color(0xff58716d))),const SizedBox(height:5),Text('${p['public_reference']}',style:const TextStyle(fontFamily:'monospace',fontSize:11))])),IconButton(tooltip:w.proof,onPressed:()=>showDialog(context:context,builder:(_)=>AlertDialog(title:Text(w.proof),content:SelectableText('${p['proof']['transactionId']}\n\n${p['proof']['committedAt']}'),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('OK'))])),icon:const Icon(Icons.qr_code_2))])));}),const SizedBox(height:16),_PrivacyNote(w.private)]))));}}

class _Brand extends StatelessWidget {final String text;const _Brand(this.text);@override Widget build(BuildContext context)=>Row(mainAxisSize:MainAxisSize.min,children:[Container(width:38,height:38,alignment:Alignment.center,decoration:BoxDecoration(color:const Color(0xff0c6b53),borderRadius:BorderRadius.circular(11)),child:const Text('R',style:TextStyle(color:Colors.white,fontWeight:FontWeight.bold))),const SizedBox(width:10),Text(text,style:const TextStyle(fontSize:19,fontWeight:FontWeight.w800))]);}
class _PrivacyNote extends StatelessWidget{final String text;const _PrivacyNote(this.text);@override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:const Color(0xffeaf3ec),borderRadius:BorderRadius.circular(14)),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[const Icon(Icons.shield_outlined,color:Color(0xff0c6b53)),const SizedBox(width:10),Expanded(child:Text(text,style:const TextStyle(color:Color(0xff385b55),height:1.4)))]));}
