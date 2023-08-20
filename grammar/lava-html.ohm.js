module.exports = String.raw`Helpers {
  Node = TextNode*
  TextNode = AnyExceptPlus<openControl>
  openControl = empty

  empty = /* nothing */
  anyExcept<lit> = (~ lit any)
  anyExceptStar<lit> = (~ lit any)*
  anyExceptPlus<lit> = (~ lit any)+
  AnyExcept<lit> = (~ lit any)
  AnyExceptPlus<lit> = (~ lit any)+
  AnyExceptStar<lit> = (~ lit any)*
  identifierCharacter = alnum | "_" | "-"

  orderedListOf<a, b, sep> =
    | nonemptyOrderedListOf<a, b, sep>
    | emptyListOf<a, sep>
  nonemptyOrderedListOf<a, b, sep> =
    | nonemptyListOf<b, sep>
    | nonemptyOrderedListOfBoth<a, b, sep>
    | nonemptyListOf<a, sep>
  nonemptyOrderedListOfBoth<a, b, sep> =
    nonemptyListOf<a, sep> (sep nonemptyListOf<b, sep>)

  singleQuote = "'" | "‘" | "’"
  doubleQuote = "\"" | "“" | "”"
  controls = "\u{007F}".."\u{009F}"
  noncharacters = "\u{FDD0}".."\u{FDEF}"
  newline = "\r"? "\n"
}

Lava <: Helpers {
  Node := (lavaNode | TextNode)*
  openControl := "{{" | "{%"
  endOfTagName = &("-%}" | "-}}" | "%}" | "}}")
  endOfVarName = ~identifierCharacter
  endOfIdentifier = endOfTagName | endOfVarName

  lavaNode =
    | lavaBlockComment
    | lavaRawTag
    | lavaDrop
    | lavaTagClose
    | lavaTagOpen
    | lavaTag
    | lavaInlineComment

  lavaTagStrict =
    | lavaTagAssign
    | lavaTagBreak
    | lavaTagContinue
    | lavaTagCycle
    | lavaTagDecrement
    | lavaTagEcho
    | lavaTagElse
    | lavaTagElsif
    | lavaTagInclude
    | lavaTagIncrement
    | lavaTagLayout
    | lavaTagLava
    | lavaTagRender
    | lavaTagSection
    | lavaTagSections
    | lavaTagWhen

  lavaTag =
    | lavaTagStrict
    | lavaTagBaseCase

  lavaTagOpenStrict =
    | lavaTagOpenCase
    | lavaTagOpenCapture
    | lavaTagOpenForm
    | lavaTagOpenFor
    | lavaTagOpenTablerow
    | lavaTagOpenIf
    | lavaTagOpenPaginate
    | lavaTagOpenUnless

  lavaTagOpen =
    | lavaTagOpenStrict
    | lavaTagOpenBaseCase

  lavaTagClose = "{%" "-"? space* "end" blockName space* tagMarkup "-"? "%}"

  // These two are the same but transformed differently
  lavaTagRule<name, markup> =
    "{%" "-"? space* (name endOfIdentifier) space* markup "-"? "%}"
  lavaTagOpenRule<name, markup> =
    "{%" "-"? space* (name endOfIdentifier) space* markup "-"? "%}"

  lavaTagBaseCase = lavaTagRule<lavaTagName, tagMarkup>

  lavaTagEcho = lavaTagRule<"echo", lavaTagEchoMarkup>
  lavaTagEchoMarkup = lavaVariable

  lavaTagAssign = lavaTagRule<"assign", lavaTagAssignMarkup>
  lavaTagAssignMarkup = variableSegment space* "=" space* lavaVariable

  lavaTagCycle = lavaTagRule<"cycle", lavaTagCycleMarkup>
  lavaTagCycleMarkup = (lavaExpression ":")? space* nonemptyListOf<lavaExpression, argumentSeparator> space*

  lavaTagIncrement = lavaTagRule<"increment", variableSegmentAsLookupMarkup>
  lavaTagDecrement = lavaTagRule<"decrement", variableSegmentAsLookupMarkup>
  lavaTagOpenCapture = lavaTagOpenRule<"capture", variableSegmentAsLookupMarkup>
  variableSegmentAsLookupMarkup = variableSegmentAsLookup space*

  lavaTagSection = lavaTagRule<"section", lavaTagSectionMarkup>
  lavaTagSectionMarkup = lavaString space*

  lavaTagSections = lavaTagRule<"sections", lavaTagSectionsMarkup>
  lavaTagSectionsMarkup = lavaString space*

  lavaTagLayout = lavaTagRule<"layout", lavaTagLayoutMarkup>
  lavaTagLayoutMarkup = lavaExpression space*

  // We'll black hole the statement and switch parser in the cst builder
  // We do this because it's technically the same grammar (with minor redefinitions)
  // and it would be a huge chore and maintenance hell to rewrite all the rules with
  // hspace = " " | "\t"
  //
  // The alternative is that this grammar parses the {% lava tagMarkup %} as its own string,
  // and then we switch to the LavaStatement grammar that
  // redefines lavaTagOpenRule, lavaTagRule, and space.
  lavaTagLava = lavaTagRule<"lava", lavaTagLavaMarkup>
  lavaTagLavaMarkup = tagMarkup

  lavaTagInclude = lavaTagRule<"include", lavaTagRenderMarkup>
  lavaTagRender = lavaTagRule<"render", lavaTagRenderMarkup>
  lavaTagRenderMarkup =
    snippetExpression renderVariableExpression? renderAliasExpression? (argumentSeparatorOptionalComma tagArguments) space*
  snippetExpression = lavaString | variableSegmentAsLookup
  renderVariableExpression = space+ ("for" | "with") space+ lavaExpression
  renderAliasExpression = space+ "as" space+ variableSegment

  lavaTagOpenBaseCase = lavaTagOpenRule<blockName, tagMarkup>

  lavaTagOpenForm = lavaTagOpenRule<"form", lavaTagOpenFormMarkup>
  lavaTagOpenFormMarkup = arguments space*

  lavaTagOpenFor = lavaTagOpenRule<"for", lavaTagOpenForMarkup>
  lavaTagOpenForMarkup =
    variableSegment space* "in" space* lavaExpression
    (space* "reversed")? argumentSeparatorOptionalComma
    tagArguments space*

  // It's the same, the difference is support for different named arguments
  lavaTagOpenTablerow = lavaTagOpenRule<"tablerow", lavaTagOpenForMarkup>

  lavaTagOpenCase = lavaTagOpenRule<"case", lavaTagOpenCaseMarkup>
  lavaTagOpenCaseMarkup = lavaExpression space*

  lavaTagWhen = lavaTagRule<"when", lavaTagWhenMarkup>
  lavaTagWhenMarkup = nonemptyListOf<lavaExpression, whenMarkupSep> space*
  whenMarkupSep = space* ("," | "or" ~identifier) space*

  lavaTagOpenIf = lavaTagOpenRule<"if", lavaTagOpenConditionalMarkup>
  lavaTagOpenUnless = lavaTagOpenRule<"unless", lavaTagOpenConditionalMarkup>
  lavaTagElsif = lavaTagRule<"elsif", lavaTagOpenConditionalMarkup>

  lavaTagBreak = lavaTagRule<"break", empty>
  lavaTagContinue = lavaTagRule<"continue", empty>
  lavaTagElse = lavaTagRule<"else", empty>

  lavaTagOpenConditionalMarkup = nonemptyListOf<condition, conditionSeparator> space*
  conditionSeparator = &logicalOperator
  condition = logicalOperator? space* (comparison | lavaExpression) space*
  logicalOperator = ("and" | "or") ~identifier
  comparison = lavaExpression space* comparator space* lavaExpression
  comparator =
    ( "=="
    | "!="
    | ">="
    | "<="
    | ">"
    | "<")
    | ("contains" ~identifier)

  lavaTagOpenPaginate = lavaTagOpenRule<"paginate", lavaTagOpenPaginateMarkup>
  lavaTagOpenPaginateMarkup =
    lavaExpression space+ "by" space+ lavaExpression argumentSeparatorOptionalComma tagArguments space*

  lavaDrop = "{{" "-"? space* lavaDropCases "-"? "}}"
  lavaDropCases = lavaVariable | lavaDropBaseCase
  lavaDropBaseCase = anyExceptStar<("-}}" | "}}")>
  lavaInlineComment = "{%" "-"? space* "#" space? tagMarkup "-"? "%}"

  lavaRawTag =
    | lavaRawTagImpl<"raw">
    | lavaRawTagImpl<"javascript">
    | lavaRawTagImpl<"schema">
    | lavaRawTagImpl<"stylesheet">
    | lavaRawTagImpl<"style">
  lavaRawTagImpl<name> =
    "{%" "-"? space* (name endOfIdentifier) space* tagMarkup "-"? "%}"
    anyExceptStar<lavaRawTagClose<name>>
    "{%" "-"? space* "end" (name endOfIdentifier) space* "-"? "%}"
  lavaRawTagClose<name> =
    "{%" "-"? space* "end" (name endOfIdentifier) space* "-"? "%}"

  lavaBlockComment =
    commentBlockStart
      (lavaBlockComment | anyExceptPlus<(commentBlockStart | commentBlockEnd)>)*
    commentBlockEnd
  commentBlockStart = "{%" "-"? space* ("comment"    endOfIdentifier) space* tagMarkup "-"? "%}"
  commentBlockEnd   = "{%" "-"? space* ("endcomment" endOfIdentifier) space* tagMarkup "-"? "%}"

  // In order for the grammar to "fallback" to the base case, this
  // rule must pass if and only if we support what we parse. This
  // implies that—since we don't support filters yet—we have a
  // positive lookahead on "-}}" or "}}" in the rule. We do this
  // because we'd otherwise positively match the following string
  // instead of falling back to the other rule:
  // {{ 'string' | some_filter }}
  lavaVariable = lavaExpression lavaFilter* space* &lavaStatementEnd
  lavaStatementEnd = ("-}}" | "}}" | "-%}" | "%}")

  lavaExpression =
    | lavaString
    | lavaNumber
    | lavaLiteral
    | lavaRange
    | lavaVariableLookup

  lavaString = lavaSingleQuotedString | lavaDoubleQuotedString
  lavaSingleQuotedString = "'" anyExceptStar<("'"| "%}" | "}}")> "'"
  lavaDoubleQuotedString = "\"" anyExceptStar<("\""| "%}" | "}}")> "\""

  lavaNumber = lavaFloat | lavaInteger
  lavaInteger = "-"? digit+
  lavaFloat = "-"? digit+ "." digit+

  lavaLiteral =
    ( "true"
    | "false"
    | "blank"
    | "empty"
    | "nil"
    | "null"
    ) endOfIdentifier

  lavaRange =
    "(" space* lavaExpression space* ".." space* lavaExpression space* ")"

  lavaVariableLookup =
    | variableSegment lookup*
    | empty lookup+
  lookup =
    | indexLookup
    | dotLookup
  indexLookup = space* "[" space* lavaExpression space* "]"
  dotLookup = space* "." space* identifier

  lavaFilter = space* "|" space* identifier (space* ":" space* arguments)?

  arguments = nonemptyOrderedListOf<positionalArgument, namedArgument, argumentSeparator>
  argumentSeparator = space* "," space*
  argumentSeparatorOptionalComma = space* ","? space*
  positionalArgument = lavaExpression ~(space* ":")
  namedArgument = variableSegment space* ":" space* lavaExpression
  tagArguments = listOf<namedArgument, argumentSeparatorOptionalComma>

  variableSegment = (letter | "_") identifierCharacter*
  variableSegmentAsLookup = variableSegment
  identifier = variableSegment "?"?

  tagMarkup = anyExceptStar<("-%}"| "%}")>

  lavaTagName =
    letter (alnum | "_")*

  blockName =
    // Shopify blocks
    ( "form"
    | "paginate"
    // Rock blocks
    | "analyticssourcefinancialtransaction"
    | "connectionopportunityconnectorgroup"
    | "financialscheduledtransactiondetail"
    | "interactioncontentchannelitemwrite"
    | "analyticsdimfamilyheadofhousehold"
    | "analyticsfactfinancialtransaction"
    | "connectionopportunitygroupconfig"
    | "analyticssourcefamilyhistorical"
    | "analyticssourcepersonhistorical"
    | "communicationresponseattachment"
    | "communicationtemplateattachment"
    | "grouplocationhistoricalschedule"
    | "eventitemoccurrencechannelitem"
    | "contentchannelitemassociation"
    | "financialscheduledtransaction"
    | "financialtransactionalerttype"
    | "registrationtemplateformfield"
    | "registrationtemplateplacement"
    | "analyticsdimfamilyhistorical"
    | "analyticsdimfinancialaccount"
    | "analyticsdimpersonhistorical"
    | "registrationtemplatediscount"
    | "achievementtypeprerequisite"
    | "connectionopportunitycampus"
    | "eventcalendarcontentchannel"
    | "eventitemoccurrencegroupmap"
    | "financialpersonsavedaccount"
    | "groupmemberscheduletemplate"
    | "registrationtemplatefeeitem"
    | "remoteauthenticationsession"
    | "workflowactionformattribute"
    | "workflowformbuildertemplate"
    | "analyticsdimfinancialbatch"
    | "benevolencerequestdocument"
    | "connectionopportunitygroup"
    | "connectionstatusautomation"
    | "financialpersonbankaccount"
    | "financialstatementtemplate"
    | "financialtransactiondetail"
    | "financialtransactionrefund"
    | "followingeventnotification"
    | "followingeventsubscription"
    | "groupmemberworkflowtrigger"
    | "interactionsessionlocation"
    | "reservationworkflowtrigger"
    | "analyticsdimfamilycurrent"
    | "analyticsdimpersoncurrent"
    | "analyticssourceattendance"
    | "analyticssourcegivingunit"
    | "connectionrequestactivity"
    | "connectionrequestworkflow"
    | "financialtransactionalert"
    | "financialtransactionimage"
    | "metafirstnamegenderlookup"
    | "registrationregistrantfee"
    | "schedulecategoryexclusion"
    | "signaturedocumenttemplate"
    | "workflowactionformsection"
    | "attendancecheckinsession"
    | "attributevaluehistorical"
    | "identityverificationcode"
    | "personallinksectionorder"
    | "registrationtemplateform"
    | "analyticsfactattendance"
    | "attributematrixtemplate"
    | "communicationattachment"
    | "followingsuggestiontype"
    | "grouplocationhistorical"
    | "personscheduleexclusion"
    | "registrationtemplatefee"
    | "communicationrecipient"
    | "connectionactivitytype"
    | "contentchannelitemslug"
    | "eventscheduledinstance"
    | "financialpaymentdetail"
    | "groupmemberrequirement"
    | "groupscheduleexclusion"
    | "registrationregistrant"
    | "analyticssourcecampus"
    | "communicationresponse"
    | "communicationtemplate"
    | "connectionopportunity"
    | "groupdemographicvalue"
    | "groupmemberassignment"
    | "groupmemberhistorical"
    | "interactiondevicetype"
    | "notificationrecipient"
    | "stepprogramcompletion"
    | "assetstorageprovider"
    | "attendanceoccurrence"
    | "financialtransaction"
    | "groupdemographictype"
    | "grouprequirementtype"
    | "identityverification"
    | "interactioncomponent"
    | "metricvaluepartition"
    | "registrationinstance"
    | "registrationtemplate"
    | "steptypeprerequisite"
    | "workflowactivitytype"
    | "attributematrixitem"
    | "benevolenceworkflow"
    | "eventitemoccurrence"
    | "personallinksection"
    | "registrationsession"
    | "reservationlocation"
    | "reservationministry"
    | "reservationresource"
    | "reservationworkflow"
    | "stepworkflowtrigger"
    | "streaktypeexclusion"
    | "systemcommunication"
    | "achievementattempt"
    | "analyticsdimcampus"
    | "attributequalifier"
    | "benevolencerequest"
    | "connectionworkflow"
    | "contentchannelitem"
    | "contentchanneltype"
    | "entitycampusfilter"
    | "followingeventtype"
    | "followingsuggested"
    | "interactionchannel"
    | "interactionsession"
    | "metalastnamelookup"
    | "metanicknamelookup"
    | "personpreviousname"
    | "workflowactionform"
    | "workflowactiontype"
    | "benevolenceresult"
    | "connectionrequest"
    | "eventcalendaritem"
    | "eventitemaudience"
    | "servicejobhistory"
    | "signaturedocument"
    | "webfarmnodemetric"
    | "connectionstatus"
    | "financialaccount"
    | "financialgateway"
    | "grouprequirement"
    | "interactionwrite"
    | "persisteddataset"
    | "Rock_Model_Block"
    | "workflowactivate"
    | "workflowactivity"
    | "achievementtype"
    | "attributematrix"
    | "backgroundcheck"
    | "benevolencetype"
    | "financialpledge"
    | "grouphistorical"
    | "metricpartition"
    | "personduplicate"
    | "personsearchkey"
    | "pluginmigration"
    | "reservationtype"
    | "workflowtrigger"
    | "assessmenttype"
    | "attendancecode"
    | "attributevalue"
    | "binaryfiledata"
    | "binaryfiletype"
    | "calendarevents"
    | "campusschedule"
    | "connectiontype"
    | "contentchannel"
    | "dataviewfilter"
    | "financialbatch"
    | "locationlayout"
    | "metriccategory"
    | "noteattachment"
    | "personaldevice"
    | "restcontroller"
    | "webfarmnodelog"
    | "workflowaction"
    | "communication"
    | "entitysetitem"
    | "eventcalendar"
    | "grouplocation"
    | "grouptyperole"
    | "lavashortcode"
    | "mergetemplate"
    | "metricytddata"
    | "pageshortlink"
    | "prayerrequest"
    | "relatedentity"
    | "authauditlog"
    | "definedvalue"
    | "documenttype"
    | "exceptionlog"
    | "mediaaccount"
    | "mediaelement"
    | "notification"
    | "personallink"
    | "personsignal"
    | "personviewed"
    | "registration"
    | "stepworkflow"
    | "workflowtype"
    | "auditdetail"
    | "campustopic"
    | "definedtype"
    | "groupmember"
    | "htmlcontent"
    | "interaction"
    | "mediafolder"
    | "metricvalue"
    | "ncoahistory"
    | "pagecontext"
    | "personalias"
    | "personalize"
    | "persontoken"
    | "phonenumber"
    | "reportfield"
    | "reservation"
    | "smspipeline"
    | "stepprogram"
    | "systememail"
    | "webfarmnode"
    | "workflowlog"
    | "assessment"
    | "attendance"
    | "authclient"
    | "binaryfile"
    | "entitytype"
    | "restaction"
    | "servicejob"
    | "servicelog"
    | "signaltype"
    | "sitedomain"
    | "stepstatus"
    | "streaktype"
    | "taggeditem"
    | "webrequest"
    | "attribute"
    | "authclaim"
    | "authscope"
    | "blocktype"
    | "entityset"
    | "eventitem"
    | "fieldtype"
    | "following"
    | "groupsync"
    | "grouptype"
    | "notewatch"
    | "pageroute"
    | "smsaction"
    | "userlogin"
    | "business"
    | "category"
    | "dataview"
    | "document"
    | "location"
    | "notetype"
    | "question"
    | "resource"
    | "schedule"
    | "steptype"
    | "workflow"
    | "execute"
    | "history"
    | "campus"
    | "device"
    | "layout"
    | "metric"
    | "person"
    | "report"
    | "search"
    | "streak"
    | "audit"
    | "badge"
    | "block"
    | "cache"
    | "group"
    | "auth"
    | "note"
    | "page"
    | "site"
    | "step"
    | "sql"
    | "tag"
    // Base blocks
    | "capture"
    | "case"
    | "for"
    | "ifchanged"
    | "if"
    | "unless"
    | "tablerow"
    ) endOfIdentifier
}

LavaStatement <: Lava {
  Node := listOf<LavaStatement, statementSep> (space | newline)*

  // This is the big brains moment: we redefine space to exclude newlines.
  //
  // Which means that all our other Lava rules can be reused
  // without modification(!)
  //
  // We don't need to maintain rules like this:
  // - lavaVariable<space>
  // - lavaExpression<space>
  // - variableLookup<space>
  // - ... long list of stuff that takes space as param
  // - lavaString<space>
  //
  // All we need is this little, VERY IMPORTANT, part right here that
  // make it so we can parse the same way in Lava tags.
  //
  // I'm putting in this huge comment so that it's more obvious.
  space := " " | "\t"

  LavaStatement =
    | lavaBlockComment
    | lavaRawTag
    | lavaTagClose
    | lavaTagOpen
    | lavaTag
    | lavaInlineComment

  lavaTagOpenRule<name, markup>
    := (name ~identifierCharacter) space* markup &lavaStatementEnd

  lavaTagRule<name, markup>
    := (name ~identifierCharacter) space* markup &lavaStatementEnd

  lavaTagClose
    := "end" (blockName ~identifierCharacter) space* tagMarkup &lavaStatementEnd

  lavaRawTagImpl<name>
    := (name ~identifierCharacter) space* tagMarkup newline
      anyExceptStar<lavaRawTagClose<name>>
      "end" name space* &lavaStatementEnd

  lavaRawTagClose<name>
    := "end" name space* &lavaStatementEnd

  lavaBlockComment :=
    commentBlockStart statementSep
      (listOf<lavaCommentBlockStatement, statementSep> statementSep)?
    commentBlockEnd

  lavaCommentBlockStatement =
    | lavaBlockComment
    | nonTerminalCommentLine

  commentBlockStart
    := ("comment" ~identifierCharacter) space* tagMarkup

  commentBlockEnd
    := ("endcomment" ~identifierCharacter) space* tagMarkup

  nonTerminalCommentLine
    = ~commentBlockEnd anyExceptPlus<newline>

  lavaInlineComment
    := "#" space? tagMarkup &lavaStatementEnd

  tagMarkup := anyExceptStar<lavaStatementEnd>

  // trailing whitespace, newline, + anything else before the next tag
  statementSep = space* newline (space | newline)*

  lavaStatementEnd := newline | end
}

LavaHTML <: Lava {
  Node := yamlFrontmatter? (HtmlNode | lavaNode | TextNode)*
  openControl += "<"

  yamlFrontmatter =
    "---" newline anyExceptStar<"---"> "---" newline

  HtmlNode =
    | HtmlDoctype
    | HtmlComment
    | HtmlRawTag
    | HtmlVoidElement
    | HtmlSelfClosingElement
    | HtmlTagClose
    | HtmlTagOpen

  // https://html.spec.whatwg.org/multipage/syntax.html#the-doctype
  HtmlDoctype =
    #("<!" caseInsensitive<"doctype"> space+ caseInsensitive<"html">) legacyDoctypeString? ">"
  legacyDoctypeString
    = anyExceptPlus<">">

  HtmlComment = "<!--" #(anyExceptStar<"-->"> "-->")

  // These are black holes, we'll ignore what's in them
  HtmlRawTag =
    | HtmlRawTagImpl<"script">
    | HtmlRawTagImpl<"style">
    | HtmlRawTagImpl<"svg">

  HtmlRawTagImpl<name> =
    TagStart<name>
      (HtmlRawTagImpl<name> | AnyExceptPlus<(TagStart<name> | TagEnd<name>)>)*
    TagEnd<name>
  TagStart<name> = "<" name AttrList ">"
  TagEnd<name> = "</" name ">"

  HtmlVoidElement =
    #("<" voidElementName &(space | "/" | ">")) AttrList "/"? ">"

  HtmlSelfClosingElement =
    #("<" tagName) AttrList "/>"

  HtmlTagOpen =
    #("<" tagName) AttrList ">"

  HtmlTagClose =
    #("</" tagName) ">"

  tagName = leadingTagNamePart trailingTagNamePart*

  // The difference here is that the first text part must start
  // with a letter, but trailing text parts don't have that
  // requirement
  leadingTagNamePart =
    | lavaDrop
    | leadingTagNameTextNode

  trailingTagNamePart =
    | lavaDrop
    | trailingTagNameTextNode

  leadingTagNameTextNode = letter (alnum | "-" | ":")*
  trailingTagNameTextNode = (alnum | "-" | ":")+

  AttrList = Attr*

  Attr =
    lavaNode | AttrSingleQuoted | AttrDoubleQuoted | AttrUnquoted | attrEmpty

  attrEmpty = attrName

  AttrUnquoted = attrName "=" attrUnquotedValue
  AttrSingleQuoted = attrName "=" singleQuote #(attrSingleQuotedValue singleQuote)
  AttrDoubleQuoted = attrName "=" doubleQuote #(attrDoubleQuotedValue doubleQuote)

  attrName = (lavaDrop | attrNameTextNode)+

  // https://html.spec.whatwg.org/#attributes-2
  attrNameTextNode = anyExceptPlus<(space | quotes | "=" | ">" | "/>" | "{{" | "{%" | controls | noncharacters)>
  attrUnquotedValue = (lavaDrop | attrUnquotedTextNode)*
  attrSingleQuotedValue = (lavaNode | attrSingleQuotedTextNode)*
  attrDoubleQuotedValue = (lavaNode | attrDoubleQuotedTextNode)*

  attrUnquotedTextNode = anyExceptPlus<(space | quotes | "=" | "<" | ">" | "${"`"}" | "{{" | "{%")>
  attrSingleQuotedTextNode = anyExceptPlus<(singleQuote | "{{" | "{%")>
  attrDoubleQuotedTextNode = anyExceptPlus<(doubleQuote | "{{" | "{%")>

  quotes = singleQuote | doubleQuote

  // https://www.w3.org/TR/2011/WD-html-markup-20110113/syntax.html#void-element
  voidElementName =
    ( caseInsensitive<"area">
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
    ) ~identifierCharacter
}

StrictLava <: Lava {
  lavaTag := lavaTagStrict
  lavaTagOpen := lavaTagOpenStrict
}

StrictLavaStatement <: LavaStatement {
  lavaTag := lavaTagStrict
  lavaTagOpen := lavaTagOpenStrict
}

StrictLavaHTML <: LavaHTML {
  lavaTag := lavaTagStrict
  lavaTagOpen := lavaTagOpenStrict
}

WithPlaceholderLava <: Lava {
  lavaTagName := (letter | "█") (alnum | "_")*
  variableSegment := (letter | "_" | "█") identifierCharacter*
}

WithPlaceholderLavaStatement <: LavaStatement {
  lavaTagName := (letter | "█") (alnum | "_")*
  variableSegment := (letter | "_" | "█") identifierCharacter*
}

WithPlaceholderLavaHTML <: LavaHTML {
  lavaTagName := (letter | "█") (alnum | "_")*
  variableSegment := (letter | "_" | "█") identifierCharacter*
}
`;