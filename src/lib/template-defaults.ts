import type {TemplateDraft} from '@/types/template';
export const defaultTemplate: TemplateDraft = {
  senderName:'',senderEmail:'',preheader:'Your email verification request has been received.',
  name:'Bilingual service notice', companyName:'[Company name]', logoUrl:'', logoAlt:'[Company name] logo', englishName:'[Company name]', arabicName:'[اسم الشركة]',
  subject:'Your verification code: {{verification_code}}',
  englishBody:'Dear {{user_name}},\n\nThank you for using our electronic services.\n\nYour email verification code is {{verification_code}}. It expires in {{verification_expiry}}.\n\nIf you did not request this verification, contact us at {{support_email}} or {{support_phone}}.',
  arabicBody:'مرحباً {{user_name}}،\n\nشكراً لاستخدام خدماتنا الإلكترونية.\n\nرمز التحقق من بريدك الإلكتروني هو {{verification_code}}. تنتهي صلاحيته خلال {{verification_expiry}}.\n\nإذا لم تطلب هذا التحقق، تواصل معنا عبر {{support_email}} أو {{support_phone}}.',
  appHeading:'Get our mobile app', appEnglish:'Access our services wherever you are.', appArabic:'استخدم خدماتنا أينما كنت.', appStoreUrl:'', playStoreUrl:'', galleryUrl:'', banners:[],
  socials:[{network:'Facebook',url:''},{network:'X',url:''},{network:'Instagram',url:''},{network:'YouTube',url:''},{network:'LinkedIn',url:''}],
  visionEnglish:'Our vision: to make our services accessible, useful and secure for everyone.', visionArabic:'رؤيتنا: جعل خدماتنا متاحة ومفيدة وآمنة للجميع.',
  disclaimer:'This communication is intended for the named recipient. If you received it by mistake, please delete it and notify the sender.',
  address:'', phone:'', fax:'', website:'', privacyUrl:'', primaryColor:'#526b59', backgroundColor:'#f1f2f2', containerWidth:590, spacing:12, verificationExpiry:'10 minutes', fontFamily:'Arial', fontSize:13, textColor:'#344054'
};
