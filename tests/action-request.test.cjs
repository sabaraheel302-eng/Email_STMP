const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');

function loadTs(file,mocks={}){const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;const original=mod.require.bind(mod);mod.require=id=>Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:original(id);mod._compile(js,file);return mod.exports}
const actionTypes=loadTs('src/types/action-request.ts');
const {actionRequestSchema,hostedFormSchema}=loadTs('src/lib/action-validation.ts',{'@/types/action-request':actionTypes});
const {blankActionRequest}=actionTypes;
const {renderActionRequest}=loadTs('src/lib/email-template.ts');
const {safeHtml}=loadTs('src/lib/mailer.ts');

test('enabled action requests require a safe HTTPS destination',()=>{
 const action={...blankActionRequest(),enabled:true,url:'https://forms.example.org/start'};
 assert.equal(actionRequestSchema.safeParse(action).success,true);
 assert.equal(actionRequestSchema.safeParse({...action,url:'http://forms.example.org'}).success,false);
 assert.equal(actionRequestSchema.safeParse({...action,url:'javascript:alert(1)'}).success,false);
});

test('hosted form schemas require unique keys and choice options',()=>{
 const base={titleEn:'Registration',titleAr:'التسجيل',descriptionEn:'',descriptionAr:'',published:true,fields:[{key:'full_name',labelEn:'Full name',labelAr:'الاسم الكامل',descriptionEn:'',descriptionAr:'',type:'full_name',required:true,options:[]}]};
 assert.equal(hostedFormSchema.safeParse(base).success,true);
 assert.equal(hostedFormSchema.safeParse({...base,fields:[...base.fields,{...base.fields[0]}]}).success,false);
 assert.equal(hostedFormSchema.safeParse({...base,fields:[{...base.fields[0],type:'dropdown'}]}).success,false);
});

test('action card escapes user content and adds campaign tracking to HTTPS links',()=>{
 const action={...blankActionRequest(),enabled:true,url:'https://forms.example.org/start',titleEn:'Complete <profile>',instructionsEn:'Open the form\nSubmit it'};
 const html=renderActionRequest(action,{user_name:'Ava'},'123e4567-e89b-42d3-a456-426614174000');
 assert.match(html,/Complete &lt;profile&gt;/);
 assert.match(html,/campaign=123e4567-e89b-42d3-a456-426614174000/);
 assert.match(html,/Open the form/);
 assert.equal(renderActionRequest({...action,url:'javascript:alert(1)'}), '');
 assert.equal(renderActionRequest({...action,enabled:false}), '');
});

test('sanitization preserves email-safe mobile action layout and paragraph spacing',()=>{
 const html='<table data-postmark-responsive="1"><tr><td class="pm-language-cell" style="padding:0 16px 28px 0">English</td><td class="pm-action-cell">Button</td></tr></table>';
 const clean=safeHtml(html);
 assert.match(clean,/padding:0 16px 28px 0/);
 assert.match(clean,/\.pm-action-cell\{display:block!important/);
});
