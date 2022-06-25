module.exports = String.raw`LavaHTML {
  Node
    = (HtmlNode | lavaNode | TextNode)*

  HtmlNode =
    | HtmlComment
    | HtmlRawTag
    | HtmlVoidElement
    | HtmlSelfClosingElement
    | HtmlTagClose
    | HtmlTagOpen

  HtmlComment = "<!--" #(anyExceptStar<"-->"> "-->")

  // These are black holes, we'll ignore what's in them
  HtmlRawTag =
    | HtmlRawTagImpl<"script">
    | HtmlRawTagImpl<"style">
    | HtmlRawTagImpl<"svg">

  HtmlRawTagImpl<name> =
    #("<" name) AttrList ">" #(anyExceptStar<endTag<name>> endTag<name>)

  endTag<name> =
    "</" name space* ">"

  HtmlVoidElement =
    #("<" voidElementName) AttrList "/"? ">"

  HtmlSelfClosingElement =
    #("<" tagNameOrLavaDrop) AttrList "/>"

  HtmlTagOpen =
    #("<" tagNameOrLavaDrop) AttrList ">"

  HtmlTagClose =
    #("</" tagNameOrLavaDrop) ">"

  tagNameOrLavaDrop =
    | tagName
    | lavaDrop

  tagName =
    letter (alnum | "-" | ":")*

  lavaTagName =
    letter (alnum | "_")*

  AttrList = Attr*

  Attr =
    lavaNode | AttrSingleQuoted | AttrDoubleQuoted | AttrUnquoted | attrEmpty

  attrEmpty = attrName

  AttrUnquoted = attrName "=" attrUnquotedValue
  AttrSingleQuoted = attrName "=" "'" #(attrSingleQuotedValue "'")
  AttrDoubleQuoted = attrName "=" "\"" #(attrDoubleQuotedValue "\"")

  // https://html.spec.whatwg.org/#attributes-2
  attrName = anyExceptPlus<(space | quotes | "=" | ">" | "/" | "{{" | "{%" | controls | noncharacters)>
  attrUnquotedValue = (attrUnquotedTextNode)*
  attrSingleQuotedValue = (lavaNode | attrSingleQuotedTextNode)*
  attrDoubleQuotedValue = (lavaNode | attrDoubleQuotedTextNode)*

  attrUnquotedTextNode = anyExceptPlus<(space | quotes | "=" | "<" | ">" | "${"`"}" | "{{" | "{%")>
  attrSingleQuotedTextNode = anyExceptPlus<("'" | "{{" | "{%")>
  attrDoubleQuotedTextNode = anyExceptPlus<("\""| "{{" | "{%")>

  quotes =  "'" | "\""

  LavaNode = lavaNode
  lavaNode = lavaRawTag | lavaDrop | lavaTagClose | lavaTagOpen | lavaTag | lavaInlineComment

  lavaTagOpen = "{%" "-"? space* blockName space* tagMarkup "-"? "%}"
  lavaTagClose = "{%" "-"? space* "end" blockName space* tagMarkup "-"? "%}"
  lavaTag = "{%" "-"? space* lavaTagName space? tagMarkup "-"? "%}"
  lavaDrop = "{{" "-"? anyExceptStar<("-}}" | "}}")> "-"? "}}"
  lavaInlineComment = "{%" "-"? space* "#" space? tagMarkup "-"? "%}"

  lavaRawTag =
    | lavaRawTagImpl<"raw">
    | lavaRawTagImpl<"comment">
    | lavaRawTagImpl<"javascript">
    | lavaRawTagImpl<"stylesheet">
    | lavaRawTagImpl<"execute">
    | lavaRawTagImpl<"sql">
  lavaRawTagImpl<name> =
    "{%" "-"? space* name space* "-"? "%}"
    anyExceptStar<lavaRawTagClose<name>>
    "{%" "-"? space* "end" name space* "-"? "%}"
  lavaRawTagClose<name> =
    "{%" "-"? space* "end" name space* "-"? "%}"

  // https://www.w3.org/TR/2011/WD-html-markup-20110113/syntax.html#void-element
  // Cheating a bit with by stretching it to the doctype
  voidElementName =
    | caseInsensitive<"!doctype">
    | caseInsensitive<"area">
    | caseInsensitive<"base">
    | caseInsensitive<"br">
    | caseInsensitive<"col">
    | caseInsensitive<"command">
    | caseInsensitive<"embed">
    | caseInsensitive<"hr">
    | caseInsensitive<"img">
    | caseInsensitive<"input">
    | caseInsensitive<"keygen">
    | caseInsensitive<"link">
    | caseInsensitive<"meta">
    | caseInsensitive<"param">
    | caseInsensitive<"source">
    | caseInsensitive<"track">
    | caseInsensitive<"wbr">

  blockName =
    // Rock blocks
    | "achievementattempt"
    | "achievementtype"
    | "achievementtypeprerequisite"
    | "analyticsdimcampus"
    | "analyticsdimfamilycurrent"
    | "analyticsdimfamilyheadofhousehold"
    | "analyticsdimfamilyhistorical"
    | "analyticsdimfinancialaccount"
    | "analyticsdimfinancialbatch"
    | "analyticsdimpersoncurrent"
    | "analyticsdimpersonhistorical"
    | "analyticsfactattendance"
    | "analyticsfactfinancialtransaction"
    | "analyticssourceattendance"
    | "analyticssourcecampus"
    | "analyticssourcefamilyhistorical"
    | "analyticssourcefinancialtransaction"
    | "analyticssourcegivingunit"
    | "analyticssourcepersonhistorical"
    | "assessment"
    | "assessmenttype"
    | "assetstorageprovider"
    | "attendance"
    | "attendancecheckinsession"
    | "attendancecode"
    | "attendanceoccurrence"
    | "attribute"
    | "attributematrix"
    | "attributematrixitem"
    | "attributematrixtemplate"
    | "attributequalifier"
    | "attributevalue"
    | "attributevaluehistorical"
    | "audit"
    | "auditdetail"
    | "auth"
    | "authauditlog"
    | "authclaim"
    | "authclient"
    | "authscope"
    | "backgroundcheck"
    | "badge"
    | "benevolencerequest"
    | "benevolencerequestdocument"
    | "benevolenceresult"
    | "benevolencetype"
    | "benevolenceworkflow"
    | "binaryfile"
    | "binaryfiledata"
    | "binaryfiletype"
    | "block"
    | "blocktype"
    | "business"
    | "cache"
    | "calendarevents"
    | "campus"
    | "campusschedule"
    | "campustopic"
    | "category"
    | "communication"
    | "communicationattachment"
    | "communicationrecipient"
    | "communicationresponse"
    | "communicationresponseattachment"
    | "communicationtemplate"
    | "communicationtemplateattachment"
    | "connectionactivitytype"
    | "connectionopportunity"
    | "connectionopportunitycampus"
    | "connectionopportunityconnectorgroup"
    | "connectionopportunitygroup"
    | "connectionopportunitygroupconfig"
    | "connectionrequest"
    | "connectionrequestactivity"
    | "connectionrequestworkflow"
    | "connectionstatus"
    | "connectionstatusautomation"
    | "connectiontype"
    | "connectionworkflow"
    | "contentchannel"
    | "contentchannelitem"
    | "contentchannelitemassociation"
    | "contentchannelitemslug"
    | "contentchanneltype"
    | "dataview"
    | "dataviewfilter"
    | "definedtype"
    | "definedvalue"
    | "device"
    | "document"
    | "documenttype"
    | "entitycampusfilter"
    | "entityset"
    | "entitysetitem"
    | "entitytype"
    | "eventcalendar"
    | "eventcalendarcontentchannel"
    | "eventcalendaritem"
    | "eventitem"
    | "eventitemaudience"
    | "eventitemoccurrence"
    | "eventitemoccurrencechannelitem"
    | "eventitemoccurrencegroupmap"
    | "eventscheduledinstance"
    | "exceptionlog"
    | "execute"
    | "fieldtype"
    | "financialaccount"
    | "financialbatch"
    | "financialgateway"
    | "financialpaymentdetail"
    | "financialpersonbankaccount"
    | "financialpersonsavedaccount"
    | "financialpledge"
    | "financialscheduledtransaction"
    | "financialscheduledtransactiondetail"
    | "financialstatementtemplate"
    | "financialtransaction"
    | "financialtransactionalert"
    | "financialtransactionalerttype"
    | "financialtransactiondetail"
    | "financialtransactionimage"
    | "financialtransactionrefund"
    | "following"
    | "followingeventnotification"
    | "followingeventsubscription"
    | "followingeventtype"
    | "followingsuggested"
    | "followingsuggestiontype"
    | "group"
    | "groupdemographictype"
    | "groupdemographicvalue"
    | "grouphistorical"
    | "grouplocation"
    | "grouplocationhistorical"
    | "grouplocationhistoricalschedule"
    | "groupmember"
    | "groupmemberassignment"
    | "groupmemberhistorical"
    | "groupmemberrequirement"
    | "groupmemberscheduletemplate"
    | "groupmemberworkflowtrigger"
    | "grouprequirement"
    | "grouprequirementtype"
    | "groupscheduleexclusion"
    | "groupsync"
    | "grouptype"
    | "grouptyperole"
    | "history"
    | "htmlcontent"
    | "identityverification"
    | "identityverificationcode"
    | "interaction"
    | "interactionchannel"
    | "interactioncomponent"
    | "interactioncontentchannelitemwrite"
    | "interactiondevicetype"
    | "interactionsession"
    | "interactionsessionlocation"
    | "interactionwrite"
    | "javascript"
    | "lavashortcode"
    | "layout"
    | "location"
    | "locationlayout"
    | "mediaaccount"
    | "mediaelement"
    | "mediafolder"
    | "mergetemplate"
    | "metafirstnamegenderlookup"
    | "metalastnamelookup"
    | "metanicknamelookup"
    | "metric"
    | "metriccategory"
    | "metricpartition"
    | "metricvalue"
    | "metricvaluepartition"
    | "metricytddata"
    | "ncoahistory"
    | "note"
    | "noteattachment"
    | "notetype"
    | "notewatch"
    | "notification"
    | "notificationrecipient"
    | "page"
    | "pagecontext"
    | "pageroute"
    | "pageshortlink"
    | "persisteddataset"
    | "person"
    | "personaldevice"
    | "personalias"
    | "personallink"
    | "personallinksection"
    | "personallinksectionorder"
    | "personduplicate"
    | "personpreviousname"
    | "personscheduleexclusion"
    | "personsearchkey"
    | "personsignal"
    | "persontoken"
    | "personviewed"
    | "phonenumber"
    | "pluginmigration"
    | "prayerrequest"
    | "question"
    | "raw"
    | "registration"
    | "registrationinstance"
    | "registrationregistrant"
    | "registrationregistrantfee"
    | "registrationsession"
    | "registrationtemplate"
    | "registrationtemplatediscount"
    | "registrationtemplatefee"
    | "registrationtemplatefeeitem"
    | "registrationtemplateform"
    | "registrationtemplateformfield"
    | "registrationtemplateplacement"
    | "relatedentity"
    | "remoteauthenticationsession"
    | "report"
    | "reportfield"
    | "reservation"
    | "reservationlocation"
    | "reservationministry"
    | "reservationresource"
    | "reservationtype"
    | "reservationworkflow"
    | "reservationworkflowtrigger"
    | "resource"
    | "restaction"
    | "restcontroller"
    | "Rock_Model_Block"
    | "schedule"
    | "schedulecategoryexclusion"
    | "search"
    | "servicejob"
    | "servicejobhistory"
    | "servicelog"
    | "signaltype"
    | "signaturedocument"
    | "signaturedocumenttemplate"
    | "site"
    | "sitedomain"
    | "smsaction"
    | "smspipeline"
    | "sql"
    | "step"
    | "stepprogram"
    | "stepprogramcompletion"
    | "stepstatus"
    | "steptype"
    | "steptypeprerequisite"
    | "stepworkflow"
    | "stepworkflowtrigger"
    | "streak"
    | "streaktype"
    | "streaktypeexclusion"
    | "stylesheet"
    | "systemcommunication"
    | "systememail"
    | "tag"
    | "taggeditem"
    | "userlogin"
    | "webfarmnode"
    | "webfarmnodelog"
    | "webfarmnodemetric"
    | "webrequest"
    | "workflow"
    | "workflowaction"
    | "workflowactionform"
    | "workflowactionformattribute"
    | "workflowactionformsection"
    | "workflowactiontype"
    | "workflowactivate"
    | "workflowactivity"
    | "workflowactivitytype"
    | "workflowformbuildertemplate"
    | "workflowlog"
    | "workflowtrigger"
    | "workflowtype"

    // Base blocks
    | "capture"
    | "case"
    | "for"
    | "ifchanged"
    | "if"
    | "unless"
    | "raw"
    | "tablerow"

  tagMarkup = anyExceptStar<("-%}"| "%}")>

  anyExcept<lit> = (~ lit any)
  anyExceptStar<lit> = (~ lit any)*
  anyExceptPlus<lit> = (~ lit any)+
  AnyExcept<lit> = (~ lit any)
  AnyExceptPlus<lit> = (~ lit any)+
  AnyExceptStar<lit> = (~ lit any)*

  TextNode = AnyExceptPlus<openControl>
  openControl = "<" | "{{" | "{%"
  controls = "\u{007F}".."\u{009F}"
  noncharacters = "\u{FDD0}".."\u{FDEF}"
}
`;