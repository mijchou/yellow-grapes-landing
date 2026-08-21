#!/usr/bin/env node
/**
 * One-time script to update Terms of Service and Privacy Policy in Firestore.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/update-legal.js
 *
 * Or with the JSON string directly:
 *   export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
 *   node scripts/update-legal.js
 */
'use strict';

const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const config = require('./legal.config.js');

// ── Credentials ──────────────────────────────────────────────────────────────

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim()) {
    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON: ' + err.message);
    }
    return cert(json);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  throw new Error(
    'No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT (JSON string) ' +
      'or GOOGLE_APPLICATION_CREDENTIALS (path to a key file).',
  );
}

// ── Parse markdown-style content into articles array ─────────────────────────

function parseArticles(content) {
  const articles = [];
  const lines = content.trim().split('\n');
  let currentTitle = '';
  let currentBody = [];

  for (const line of lines) {
    // Match `# 1. Title` pattern (top-level article headers)
    const headerMatch = line.match(/^#\s+(\d+\..*)/);
    if (headerMatch) {
      // Save previous article if any
      if (currentTitle || currentBody.length) {
        articles.push({
          title: currentTitle.trim(),
          body: currentBody.join('\n').trim(),
        });
      }
      currentTitle = headerMatch[1];
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Don't forget the last article
  if (currentTitle || currentBody.length) {
    articles.push({
      title: currentTitle.trim(),
      body: currentBody.join('\n').trim(),
    });
  }

  return articles;
}

// ── Document content ─────────────────────────────────────────────────────────

const TOS_ZH = `
# 1. 接受條款與適用範圍

歡迎使用 Yellow Grapes（以下稱「本服務」）。本服務係由拓偕科技有限公司（以下稱「我們」）提供，內容包括 Yellow Grapes 行動應用程式、相關網站、管理介面、商家認領流程、酒單與商家資料展示、收藏功能、使用者建議編輯機制，以及我們不時提供的其他相關服務。

只要您下載、存取、瀏覽、註冊或使用本服務，即表示您已閱讀、理解並同意受本使用條款及我們的隱私權政策拘束。若您不同意，請勿使用本服務。

如您係代表公司、商號或其他組織使用本服務，您聲明並保證您有權使該組織受本條款拘束。

# 2. 年齡與資格

本服務主要提供與酒類相關商家資訊、酒單資訊與酒類體驗探索。依台灣酒類管理規範，我們不得向未滿十八（18）歲之人推廣或提供不當酒類交易安排；因此，您必須年滿十八（18）歲，或在法律允許且已取得法定代理人同意的情況下，方可註冊帳戶、提交酒類相關內容、申請商家認領、購買或使用日後可能推出之會員／優惠方案。

您聲明您提供的資料真實、完整且最新；如資料變更，您應即時更新。

# 3. 帳戶註冊與安全

您可以匿名瀏覽部分內容，但部分功能（例如收藏、提交編輯建議、檢舉、商家認領、商家管理）需要註冊帳戶。

您應妥善保管登入憑證並對帳戶下發生之行為負責。若您懷疑帳戶遭未經授權使用，應立即通知我們。

我們得拒絕、暫停或終止具冒名、虛偽、濫用或違法風險之帳戶。

# 4. 本服務性質

Yellow Grapes 主要係資訊與社群協作平台，用於協助使用者探索酒類相關商家、查看商家與酒單資料、收藏內容，以及提交資料修正建議。

除非我們另以書面明示，Yellow Grapes 本身不是酒類賣方、零售商、進口商、餐飲提供者、物流商或付款代收代付機構，也不保證任何商家之酒類、餐飲、活動、價格、庫存、營業狀態或服務品質。

商家資料、酒單、價格、營業時間、活動資訊與其他內容可能因商家、使用者或第三方來源之更新而隨時變動。

# 5. 使用者內容與編輯建議

您得依本服務介面提交編輯建議、酒單修正、商家認領資料、檢舉、評論性說明、圖片或其他內容（合稱「使用者內容」）。

您保證：

• 您對使用者內容具有必要權利，且內容不侵害他人之著作權、商標權、營業秘密、肖像權、隱私權或其他權利；

• 使用者內容真實、盡您所知為最新，且非誤導、詐欺、騷擾、誹謗、仇恨、色情、暴力、垃圾訊息或其他違法內容；

• 您不會上傳任何病毒、惡意程式、爬蟲、未經授權自動化腳本，或干擾本服務運作之內容。

您保留使用者內容之權利，但您授予我們全球、非專屬、免權利金、可轉授權之授權，得為提供、營運、改善、翻譯、整理、展示、散布、重製、改作、備份、審核及推廣本服務之目的使用該等內容。

我們無義務刊登或採納任何使用者內容，並得依審核結果全部、部分採用、拒絕、下架、延後處理或要求補件。

# 6. 商家認領與商家管理

若您以商家經營者、員工或授權代理人身分申請認領商家，您聲明並保證您確有足夠權限代表該商家。

您提交之認領資料（例如聯絡資訊、證明文件、官方電話驗證資訊）必須真實且完整。我們得要求補充文件、人工審核，或拒絕／撤銷認領。

被認領商家之經營者可維護商家資料及酒單，但仍應自行確保其內容之正確性、合法性、智慧財產權授權與消費資訊揭露之適法性。

如我們合理認為商家資料涉及爭議、權利侵害、消費風險或法令疑義，我們得暫停顯示、限制編輯或撤銷認領權限。

# 7. 禁止行為

您不得：

• 違反中華民國（台灣）法令或所在地法令；

• 冒用他人身分、假冒商家、偽造資料或誤導使用者；

• 大量抓取、複製、鏡像、反向工程或未經授權存取本服務、資料庫或介面；

• 利用本服務推廣違法販酒、向未成年人提供酒類、規避年齡限制或其他違法交易；

• 上傳侵權、機密、個資過量揭露或含敏感個資之內容；

• 干擾地圖、搜尋、建議編輯、認領審核、分析或通知功能之正常運作。

如您違反本條款，我們得採取警示、刪除內容、限制功能、暫停或終止帳戶、拒絕未來使用，並於必要時通報主管機關或配合法律程序。

# 8. 智慧財產權

除使用者內容及第三方內容外，本服務之軟體、版面、設計、資料整理、商標、標誌、文字、圖片、介面與相關權利均屬我們或授權人所有。

在您遵守本條款之前提下，我們授予您有限、非專屬、不可轉讓、可撤銷之權限，以供您個人、非商業目的使用本服務。除本條款明示允許外，您不得重製、改作、散布、公開傳輸、出租、出售或另行利用。

# 9. 第三方服務與外部連結

本服務可能整合或連結第三方服務，例如 Firebase、Google Sign-In、LINE Sign-In、Mapbox、推播服務、分析工具、付款服務、地圖導航或社群媒體連結。該等第三方服務受其各自條款與隱私政策拘束。

我們不對第三方服務之可用性、安全性、內容、正確性或資料處理方式負責。您與第三方之交易或互動，原則上僅存在於您與該第三方之間。

# 10. 付費方案、優惠與退款

目前 Yellow Grapes 之核心功能可能為免費；惟我們日後可能推出會員、訂閱、通行證、合作商家優惠或其他付費功能（以下稱「付費服務」）。

若您購買付費服務，我們將於購買流程中揭露價格、計費週期、適用範圍、限制條件、自動續訂安排（如有）、退款規則與生效時間。您應依當時揭露之條件付款。

除強制法律另有規定外，已生效、已使用、具有即時履行性質或屬法定例外之數位內容／服務，可能不適用七日猶豫期或退款；實際處理仍以適用消費者保護法令及購買頁面揭露條件為準。

合作商家之優惠、開瓶費減免、買一送一或其他活動，係由合作商家最終提供與履行；商家如有名額、時段、品項、地區或其他限制，應以活動說明及商家現場公告為準。

# 11. 免責聲明

本服務係依「現況」及「現有可得」基礎提供。在適用法律允許之最大範圍內，我們不保證本服務不中斷、無錯誤、完全安全、完全正確、符合特定目的，或任何商家資訊、酒單、價格、庫存、營業時間、導航、評分、收藏數、編輯採納結果一定完整或最新。

您應自行判斷並承擔使用本服務、造訪商家、參與活動、購買商品或飲酒之風險。請理性飲酒，切勿酒後駕車。

# 12. 責任限制

於適用法律允許之最大範圍內，我們對於任何間接、附帶、特別、衍生性或懲罰性損害，或因資料遺失、營業中斷、商譽受損、機會損失所生之損害，不負責任。

於適用法律允許之最大範圍內，若我們依法仍須負責，除因故意或重大過失、人格權侵害、消費者保護法或其他不得排除限制之責任外，我們對您就本服務所生之累積責任，以您於損害發生前十二（12）個月內就相關付費服務實際支付予我們之金額，或新台幣三千元（以較高者為準）為上限。

# 13. 您對我們之補償

若因您違反本條款、違法使用本服務、侵害他人權利、提交不實或侵權內容，或您與商家／第三方間之爭議，導致我們、關係企業、人員、受託人或合作夥伴受有任何主張、損失、損害、責任、成本或費用（包括合理律師費），您應負責賠償並使其免受損害。

# 14. 終止與停止提供

您得隨時停止使用本服務並申請刪除帳戶；惟依法或為處理爭議、稽核、資安、反濫用、履約或保存紀錄所必要者，不在此限。

我們得基於維護服務安全、法令遵循、系統維護、商業策略或您違反本條款之情形，全部或部分修改、暫停或終止本服務或您的權限。

# 15. 條款修改

我們得不時修改本條款。重大修改將以 App 內公告、網站公告、電子郵件或其他合理方式通知。修改後您若繼續使用本服務，即視為同意修訂後條款。

# 16. 準據法與爭議處理

本條款以中華民國（台灣）法律為準據法，不適用其涉外法規範衝突原則。

因本條款或本服務所生之爭議，雙方應先以誠信協商處理；如仍無法解決，除法律另有專屬管轄規定外，以【台灣台北地方法院／營運者主營業地之地方法院】為第一審管轄法院。

# 17. 聯絡資訊

如您對本條款有任何疑問，請聯絡：

營運者：拓偕科技有限公司

電子郵件：contact@torsade.com.tw
`;

const TOS_EN = `
# 1. Acceptance and Scope

Welcome to Yellow Grapes (the "Service"). The Service is provided by Torsade Technologies Company Limited ("we", "us", or "our") and includes the Yellow Grapes mobile application, related websites, admin interfaces, merchant claim workflows, merchant and wine-list displays, favorites features, user edit suggestions, and any related services we may offer from time to time.

By downloading, accessing, browsing, registering for, or using the Service, you confirm that you have read, understood, and agreed to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service.

If you use the Service on behalf of a company or other organization, you represent and warrant that you have authority to bind that organization to these Terms.

# 2. Age and Eligibility

The Service is centered on wine-related merchant discovery, wine-list information, and alcohol-related experiences. In light of Taiwan's alcohol-related rules, you must be at least eighteen (18) years old, or otherwise legally permitted and duly authorized by your legal guardian where applicable, to register an account, submit alcohol-related content, apply to claim a business, or purchase or use any future membership or promotional plan.

You represent that the information you provide is accurate, complete, and up to date, and that you will promptly update it if it changes.

# 3. Accounts and Security

Some parts of the Service may be available without logging in, but certain features, such as saving favorites, submitting edit suggestions, reporting issues, claiming a merchant, or managing a business listing, require an account.

You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us promptly if you suspect unauthorized access or misuse.

We may refuse, suspend, or terminate accounts that present impersonation, fraud, abuse, or legal-compliance risks.

# 4. Nature of the Service

Yellow Grapes is primarily an information and community-collaboration platform that helps users discover wine-related merchants, view merchant and wine-list information, save content, and suggest corrections.

Unless we expressly state otherwise in writing, Yellow Grapes itself is not the seller, retailer, importer, restaurant operator, logistics provider, or payment collection agent for alcohol, food, events, or merchant services listed through the Service.

Merchant details, wine lists, prices, opening hours, events, and other content may change at any time based on updates from merchants, users, and third-party sources.

# 5. User Content and Edit Suggestions

You may submit edit suggestions, wine-list updates, merchant claim materials, reports, explanatory text, images, and other content through the Service (collectively, "User Content").

You represent and warrant that:

• you have all rights and permissions needed to submit the User Content;

• the User Content does not infringe any copyright, trademark, trade secret, privacy, publicity, or other rights;

• the User Content is truthful and, to the best of your knowledge, current, and is not fraudulent, misleading, harassing, defamatory, hateful, obscene, violent, spammy, or otherwise unlawful; and

• you will not upload malware, harmful code, unauthorized automation, or anything that interferes with the Service.

You retain ownership of your User Content, but you grant us a worldwide, non-exclusive, royalty-free, sublicensable license to host, store, review, translate, adapt, reproduce, display, distribute, and otherwise use the User Content as reasonably necessary to operate, improve, audit, secure, market, and provide the Service.

We are not obligated to publish, accept, or act on any User Content, and we may accept, reject, remove, delay, or request supporting materials in our discretion.

# 6. Merchant Claims and Merchant Management

If you apply to claim a merchant as an owner, employee, or authorized representative, you represent and warrant that you have sufficient authority to act for that business.

Claim materials, including contact details, proof documents, and verification information, must be truthful and complete. We may request additional evidence, conduct manual review, reject a request, or revoke a claim if necessary.

Claimed merchants may maintain their merchant information and wine lists, but they remain responsible for ensuring accuracy, legality, intellectual-property clearance, and compliance with consumer disclosure obligations.

We may suspend display, restrict editing, or revoke claim privileges if we reasonably believe a listing involves a dispute, infringement, consumer risk, or legal-compliance concern.

# 7. Prohibited Conduct

You may not:

• violate the laws of Taiwan or any other applicable law;

• impersonate another person or business, forge materials, or mislead users;

• scrape, copy, mirror, reverse engineer, or gain unauthorized access to the Service, its databases, or interfaces;

• use the Service to facilitate unlawful alcohol sales, provide alcohol to minors, evade age restrictions, or support any illegal transaction;

• upload infringing, confidential, excessively personal, or sensitive personal data without authorization; or

• interfere with maps, search, edit suggestions, claim review, analytics, notifications, or any other Service function.

If you violate these Terms, we may warn you, remove content, limit features, suspend or terminate access, refuse future use, and cooperate with authorities or legal process where appropriate.

# 8. Intellectual Property

Except for User Content and third-party materials, the Service, including its software, layout, design, compilations, trademarks, logos, text, images, interfaces, and related rights, is owned by us or our licensors.

Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal, non-commercial purposes. Except as expressly allowed, you may not reproduce, adapt, distribute, publicly transmit, rent, sell, or otherwise exploit the Service.

# 9. Third-Party Services and Links

The Service may integrate with or link to third-party services such as Firebase, Google Sign-In, LINE Sign-In, Mapbox, push-notification services, analytics providers, payment processors, navigation apps, and social platforms. Those third parties operate under their own terms and privacy policies.

We are not responsible for the availability, security, content, accuracy, or data practices of third-party services. Your dealings with third parties are generally between you and the relevant third party.

# 10. Paid Plans, Promotions, and Refunds

The core Service may be free at launch, but we may later offer memberships, subscriptions, passes, partner promotions, or other paid features ("Paid Services").

If you purchase Paid Services, we will disclose the price, billing cycle, scope, limitations, auto-renewal terms (if any), refund rules, and effective timing at checkout or in the applicable offer details. You agree to pay according to those disclosed terms.

To the extent permitted by law, digital content or services that are activated, consumed, or fall within statutory exceptions may not be eligible for a 7-day cooling-off period or refund. Actual handling will remain subject to mandatory consumer-protection law and the terms disclosed at purchase.

Partner-merchant offers, corkage waivers, buy-one-get-one offers, and similar benefits are ultimately provided and fulfilled by the participating merchant, and may be subject to quotas, booking windows, item exclusions, location limits, or other conditions.

# 11. Disclaimers

THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, COMPLETELY SECURE, ACCURATE, CURRENT, OR FIT FOR A PARTICULAR PURPOSE, OR THAT ANY MERCHANT INFORMATION, WINE LIST, PRICING, INVENTORY, OPENING HOUR, NAVIGATION, RATING, SAVE COUNT, OR REVIEW OUTCOME WILL BE COMPLETE OR UP TO DATE.

You are solely responsible for your decisions and conduct when using the Service, visiting merchants, joining events, making purchases, or consuming alcohol. Please drink responsibly and never drink and drive.

# 12. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, BUSINESS, GOODWILL, OPPORTUNITY, OR PROFITS.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, IF WE ARE FOUND LIABLE, OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US FOR THE RELEVANT PAID SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) NT$3,000, EXCEPT WHERE LIABILITY CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW, INCLUDING LIABILITY FOR INTENTIONAL MISCONDUCT OR GROSS NEGLIGENCE.

# 13. Indemnity

You agree to indemnify and hold harmless us, our affiliates, personnel, contractors, and partners from and against any claims, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your breach of these Terms, unlawful use of the Service, infringement of another party's rights, false or infringing submissions, or disputes between you and a merchant or third party.

# 14. Suspension and Termination

You may stop using the Service at any time and may request account deletion, subject to data we must retain for legal compliance, dispute handling, fraud prevention, security, audit, or contractual performance.

We may modify, suspend, or discontinue all or part of the Service, or suspend or terminate your access, for security, maintenance, legal compliance, business reasons, or violations of these Terms.

# 15. Changes to These Terms

We may update these Terms from time to time. If we make material changes, we will provide notice through the app, website, email, or another reasonable method. Your continued use of the Service after the updated Terms take effect means you accept the revised Terms.

# 16. Governing Law and Disputes

These Terms are governed by the laws of the Republic of China (Taiwan), without regard to conflict-of-law principles.

Any dispute arising out of or relating to these Terms or the Service should first be discussed in good faith. Unless mandatory law provides otherwise, the court of first instance with jurisdiction shall be the [Taipei District Court / district court at our principal place of business in Taiwan].

# 17. Contact Information

If you have questions about these Terms, please contact us:

Operator: Torsade Technologies Company Limited

Email: contact@torsade.com.tw
`;

const PRIVACY_ZH = `
# 1. 本政策適用範圍

本隱私權政策說明拓偕科技有限公司（以下稱「我們」）如何於 Yellow Grapes 行動應用程式及相關服務中蒐集、處理、利用、保存與分享個人資料。

本政策應與本服務使用條款併同閱讀。若本政策與強制法令有不一致之處，以適用法令為準。

# 2. 我們蒐集的資料類型

依您使用本服務之方式不同，我們可能蒐集以下資料：

• 帳戶與識別資料：例如姓名、顯示名稱、電子郵件地址、登入供應商識別資訊、頭像。

• 使用者偏好與帳戶設定：例如語言、通知設定、收藏商家與收藏酒款、同意條款紀錄。

• 您主動提交之內容：例如編輯建議、酒單修正、檢舉內容、客服訊息、問卷回覆、商家認領資料、證明文件。

• 商家管理資料：若您認領商家，我們可能蒐集商家聯絡資訊、審核資料、認證紀錄、商家管理紀錄與操作歷程。

• 裝置與技術資料：例如裝置型號、作業系統版本、App 版本、語言、IP 位址、崩潰紀錄、診斷與分析資料。

• 位置資料：若您授權，我們可能蒐集精確或概略位置，用於顯示附近商家、地圖置中與搜尋區域功能。

• 交易與方案資料：若日後推出付費功能，我們可能蒐集訂閱狀態、購買紀錄、兌換紀錄與付款相關識別碼（但不一定直接保存完整信用卡資訊）。

除法律允許或要求外，我們原則上不會主動要求您提供醫療、健康、基因、犯罪前科等敏感個人資料。請勿於提交內容中主動揭露與本服務目的無關之敏感資料。

# 3. 蒐集目的

我們蒐集與利用個人資料之主要目的包括：

• 提供帳戶註冊、登入、身分驗證與帳戶管理；

• 提供地圖、搜尋、收藏、酒單瀏覽、個人化顯示與在地探索功能；

• 接收、審核與處理編輯建議、商家認領申請、檢舉與客服需求；

• 讓商家經營者管理其已認領之商家與酒單；

• 進行服務維運、資安防護、除錯、分析、統計與改善體驗；

• 在您同意或法令允許之範圍內，寄送服務通知、活動消息、行銷或優惠資訊；

• 履行法律義務、回應主管機關要求、處理爭議與主張權利。

# 4. 法律依據與告知事項（台灣個資法）

依台灣《個人資料保護法》，我們將於蒐集個人資料時或依法律容許之時間點，告知蒐集者名稱、蒐集目的、資料類別、利用期間、地區、對象及方式，以及您依法得行使之權利與不提供資料可能對您權益之影響。

若您拒絕提供必要資料，我們可能無法為您建立帳戶、處理認領申請、回覆客服、提供個人化功能，或完成您要求之服務。

# 5. 資料利用方式

我們僅於與蒐集目的具有正當合理關聯且必要之範圍內利用您的資料，並採取適當措施避免不當使用。

我們可能將資料用於內部資料彙整、去識別化分析、服務安全監控、功能測試與營運決策；惟若資料可識別特定個人，我們仍將依適用法令處理。

# 6. 我們可能分享資料的對象

我們不會任意出售您的個人資料。惟在以下範圍內，我們可能提供或揭露資料：

• 雲端與技術服務供應商：例如 Firebase/Google Cloud、Mapbox、推播、分析、錯誤追蹤、客服與儲存服務供應商；

• 登入與身分驗證服務：例如 Google、LINE；

• 付款與交易處理方：如日後推出訂閱或付費方案；

• 商家經營者：若您對已認領商家提交建議、檢舉或認領爭議資料，我們可能將必要資訊提供給該商家或其代表以利審核與處理；

• 專業顧問與受託人：例如律師、會計師、稽核、資安顧問；

• 主管機關、司法機關或依法有權機關：於法律要求、調查、執法、權利主張或防止危害時；

• 企業交易相對人：如公司重組、併購、資產移轉或投資交易中，於合法且必要範圍內。

若涉及跨境傳輸，我們會在合理可行範圍內採取合約、權限控管與安全措施保護資料。

# 7. 國際傳輸

由於我們可能使用位於台灣以外之雲端與技術供應商，您的個人資料可能被傳輸至或儲存於台灣以外地區。您理解並同意，在適用法令允許範圍內，我們得為本政策所載目的進行必要之跨境處理與利用。

# 8. Cookie、SDK 與類似技術

我們或第三方服務供應商可能使用 SDK、裝置識別碼、日誌、Cookie 或類似技術，以維持登入狀態、記錄偏好、分析流量、衡量功能使用情況、進行防濫用與改善服務。

您可透過裝置或應用程式設定限制部分權限，但這可能影響部分功能之正常運作。

# 9. 資料保存期間

我們會在達成蒐集目的所必要期間內保存個人資料，並依適用法令、契約、稅務、會計、爭議處理、反詐欺、資安與稽核需求決定具體保存時間。

帳戶刪除後，我們可能在合理期間內保留必要紀錄，以履行法律義務、處理爭議、維護安全，或保留去識別化／彙總資料作統計分析。

# 10. 您的權利

依台灣《個人資料保護法》第 3 條，您得就您的個人資料行使下列權利：

• 查詢或請求閱覽；

• 請求製給複製本；

• 請求補充或更正；

• 請求停止蒐集、處理或利用；

• 請求刪除。

您可透過【客服信箱／App 內聯絡表單】與我們聯繫。我們得為確認身分而要求合理驗證資訊，並於法律允許範圍內回覆您的請求。

# 11. 資料安全

我們採取合理之技術與組織安全措施，以保護個人資料免於未經授權存取、竄改、毀損、滅失或洩漏，例如權限控管、身分驗證、加密傳輸、稽核紀錄與最小權限原則。

但任何系統均無法保證絕對安全。若發生個資外洩、遺失或其他事故，我們將依適用法令採取應變措施並通知受影響當事人及／或主管機關。

# 12. 未成年人的資料

本服務聚焦酒類相關資訊。我們不希望未滿十八（18）歲之人註冊付費、認領商家或參與酒類相關互動。如您為法定代理人且認為未成年人向我們提供了不當資料，請與我們聯繫，我們將在法律允許範圍內處理。

# 13. 第三方內容與外部網站

本服務可能連結第三方網站、地圖導航、社群平台或商家外部頁面。該等第三方對其自身資料處理行為負責，請您另行參閱其隱私政策。

# 14. 政策修改

我們得不時修訂本隱私權政策。若有重大變更，我們將以 App 內公告、網站公告、電子郵件或其他合理方式通知您。修訂後繼續使用本服務，即表示您同意修訂後內容。

# 15. 聯絡我們

若您對本政策或個人資料處理有任何疑問、申訴或權利行使需求，請聯絡：

營運者：拓偕科技有限公司

電子郵件：contact@torsade.com.tw
`;

const PRIVACY_EN = `
# 1. Scope of This Policy

This Privacy Policy explains how Torsade Technologies Company Limited ("we", "us", or "our") collects, processes, uses, stores, and shares personal data in connection with the Yellow Grapes mobile application and related services.

This Policy should be read together with our Terms of Service. If any part of this Policy conflicts with mandatory law, applicable law will prevail.

# 2. Categories of Data We Collect

Depending on how you use the Service, we may collect the following categories of data:

• Account and identity data, such as your name, display name, email address, sign-in provider identifiers, and profile photo.

• Preference and settings data, such as language, notification preferences, saved merchants, saved wine items, and records of legal consents.

• Content you submit, such as edit suggestions, wine-list corrections, reports, customer support messages, survey responses, claim materials, and verification documents.

• Merchant-management data, if you claim a business, including contact details, review materials, verification records, and operational history.

• Device and technical data, such as device model, OS version, app version, language, IP address, crash logs, diagnostics, and analytics information.

• Location data, if you grant permission, including precise or approximate location used for nearby merchants, map centering, and area search functions.

• Transaction and plan data, if we launch paid features, including subscription status, purchase history, redemption history, and payment-related identifiers, though we may not directly store full payment-card details.

Unless permitted or required by law, we do not intend to collect sensitive personal data such as medical, health, genetic, or criminal-record data. Please do not submit sensitive data that is unrelated to the Service.

# 3. Purposes of Collection and Use

We collect and use personal data for the following main purposes:

• to register and manage accounts, authenticate users, and support login;

• to provide maps, search, favorites, wine-list browsing, personalization, and local discovery functions;

• to receive, review, and process edit suggestions, merchant claims, reports, and support requests;

• to enable business owners to manage claimed merchants and wine lists;

• to operate, secure, debug, analyze, and improve the Service;

• to send service notices and, where permitted, marketing, promotions, or event information; and

• to comply with legal obligations, respond to authorities, resolve disputes, and enforce rights.

# 4. Taiwan PDPA Notice

Under Taiwan's Personal Data Protection Act, we will provide notice regarding the name of the collector, purposes of collection, data categories, period, area, recipients and methods of use, your statutory rights, and the consequences of not providing required data, at the time of collection or as otherwise permitted by law.

If you do not provide data necessary for a specific function, we may be unable to create your account, process a claim request, respond to support, enable personalization, or complete the requested service.

# 5. How We Use Data

We use personal data only within the scope necessary for the stated purposes and in a manner reasonably connected to those purposes.

We may also use data for internal aggregation, de-identified analysis, service-security monitoring, feature testing, and operational decision-making, subject to applicable law where data remains identifiable.

# 6. When We Share Data

We do not sell your personal data as a general business model. We may disclose data in the following circumstances:

• Cloud and technology providers, such as Firebase/Google Cloud, Mapbox, push-notification, analytics, error-tracking, storage, and customer-support vendors;

• Identity and sign-in providers, such as Google and LINE;

• Payment and transaction processors, if we offer subscriptions or paid plans;

• Merchant owners or their representatives, where reasonably necessary to review suggestions, reports, or claim-related disputes involving a claimed business;

• Professional advisers and contractors, such as lawyers, accountants, auditors, or security consultants;

• Authorities, regulators, courts, or law-enforcement bodies where required by law or necessary to protect rights, investigate misconduct, or prevent harm; and

• Parties to a merger, restructuring, financing, acquisition, or asset transfer, to the extent legally and operationally necessary.

Where cross-border transfer is involved, we will use reasonable safeguards, including contractual and access-control measures where appropriate.

# 7. International Transfer

Because we may use cloud and technology vendors located outside Taiwan, your personal data may be transferred to, processed in, or stored outside Taiwan. You understand and agree that, to the extent permitted by applicable law, such cross-border processing may occur for the purposes described in this Policy.

# 8. SDKs, Cookies, and Similar Technologies

We and our service providers may use SDKs, device identifiers, logs, cookies, and similar technologies to keep you signed in, remember preferences, analyze traffic, measure feature usage, prevent abuse, and improve the Service.

You can limit some permissions through your device or app settings, but doing so may affect functionality.

# 9. Retention

We retain personal data for as long as reasonably necessary to fulfill the stated purposes and for additional periods required or permitted by applicable law, contract, tax, accounting, dispute-resolution, fraud-prevention, security, and audit obligations.

After account deletion, we may retain necessary records for a reasonable period to meet legal obligations, resolve disputes, maintain security, or preserve de-identified and aggregated information for analytics.

# 10. Your Rights

Under Article 3 of Taiwan's Personal Data Protection Act, you may have the right to:

• inquire about or review your personal data;

• request a copy of your personal data;

• request supplementation or correction;

• request cessation of collection, processing, or use; and

• request deletion.

You may exercise these rights by contacting us at [Privacy / Support Email] or through the in-app contact form. We may request reasonable verification information before acting on a request.

# 11. Security

We implement reasonable technical and organizational safeguards to protect personal data against unauthorized access, alteration, damage, loss, or leakage, including access controls, authentication, encrypted transmission, audit logging, and least-privilege practices.

No system can be completely secure. If a personal-data incident occurs, we will take responsive measures and provide notifications to affected individuals and/or competent authorities as required by law.

# 12. Minors

The Service focuses on alcohol-related merchant information. We do not intend for persons under eighteen (18) to register for paid features, claim merchants, or engage in alcohol-related interactive functions. If you are a parent or legal guardian and believe a minor has improperly provided personal data, please contact us and we will address the matter as permitted by law.

# 13. Third-Party Content and External Sites

The Service may link to third-party websites, map-navigation services, social platforms, or merchant pages. Those third parties are responsible for their own privacy practices, and you should review their policies separately.

# 14. Changes to This Policy

We may revise this Privacy Policy from time to time. If we make material changes, we will notify you by in-app notice, website notice, email, or another reasonable method. Continued use of the Service after the revised Policy takes effect means you accept the updated Policy.

# 15. Contact Us

If you have any questions, complaints, or requests regarding this Policy or our handling of personal data, please contact us:

Operator: Torsade Technologies Company Limited

Email: contact@torsade.com.tw
`;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const credential = resolveCredential();
  const app = initializeApp({ credential, projectId: config.projectId });
  const db = getFirestore();

  console.log(`Updating "${config.collection}" in project "${config.projectId}" …\n`);

  // Parse articles
  const tosArticlesZh = parseArticles(TOS_ZH);
  const tosArticlesEn = parseArticles(TOS_EN);
  const privacyArticlesZh = parseArticles(PRIVACY_ZH);
  const privacyArticlesEn = parseArticles(PRIVACY_EN);

  console.log(`ToS: ${tosArticlesZh.length} zh articles, ${tosArticlesEn.length} en articles`);
  console.log(`Privacy: ${privacyArticlesZh.length} zh articles, ${privacyArticlesEn.length} en articles\n`);

  // Get current versions to increment
  const tosRef = db.collection(config.collection).doc('tos');
  const privacyRef = db.collection(config.collection).doc('privacy_policy');

  const [tosSnap, privacySnap] = await Promise.all([tosRef.get(), privacyRef.get()]);

  const tosCurrentVersion = tosSnap.exists ? (tosSnap.data().current_version || 0) : 0;
  const privacyCurrentVersion = privacySnap.exists ? (privacySnap.data().current_version || 0) : 0;

  const now = FieldValue.serverTimestamp();

  // Update ToS
  await tosRef.set({
    current_version: tosCurrentVersion + 1,
    updated_at: now,
    articles_zh: tosArticlesZh,
    articles_en: tosArticlesEn,
  });
  console.log(`✓ ToS updated: v${tosCurrentVersion} → v${tosCurrentVersion + 1}`);

  // Update Privacy Policy
  await privacyRef.set({
    current_version: privacyCurrentVersion + 1,
    updated_at: now,
    articles_zh: privacyArticlesZh,
    articles_en: privacyArticlesEn,
  });
  console.log(`✓ Privacy Policy updated: v${privacyCurrentVersion} → v${privacyCurrentVersion + 1}`);

  console.log('\nFirestore updated. Now run:');
  console.log('  npm run build:all');
  console.log('  # or push to main to trigger the GitHub Action deploy');
}

main().catch((err) => {
  console.error('\n✗ update-legal failed:', err.message);
  process.exit(1);
});
