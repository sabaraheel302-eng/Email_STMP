export type TemplateAsset = { id: string; url: string; alt: string; href: string; filename?: string };
export type SocialLink = { network: 'Facebook'|'X'|'Instagram'|'YouTube'|'LinkedIn'; url: string; icon?: TemplateAsset|null };
export type EmailTemplate = {
  id: string; name: string; companyName: string; logoUrl: string; logoAsset?:TemplateAsset|null; logoAlt: string;
  englishName: string; arabicName: string; subject: string; englishBody: string; arabicBody: string;
  appHeading: string; appEnglish: string; appArabic: string; appStoreUrl: string; playStoreUrl: string; galleryUrl: string;
  appStoreBadge?:TemplateAsset|null;playStoreBadge?:TemplateAsset|null;galleryBadge?:TemplateAsset|null;
  banners: TemplateAsset[]; socials: SocialLink[]; visionEnglish: string; visionArabic: string;
  disclaimer: string; address: string; phone: string; fax: string; website: string; privacyUrl: string;
  primaryColor: string; backgroundColor: string; containerWidth: number; spacing: number; verificationExpiry: string;
  fontFamily: 'Arial'|'Verdana'|'Georgia'; fontSize: number; textColor: string;
  createdAt: string; updatedAt: string;
};
export type TemplateDraft = Omit<EmailTemplate, 'id'|'createdAt'|'updatedAt'>;
