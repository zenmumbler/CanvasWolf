// -- (c) 2004-7 by Arthur Langereis

// ==================================================================
// Runtime Environment Check
// ==================================================================
var _nua = navigator.userAgent;

var UA_OPERA	= !!(window.opera);
var UA_MSIE		= (!UA_OPERA) && _nua.indexOf("MSIE")>-1;
var UA_SAFARI	= (!UA_OPERA) && _nua.indexOf("AppleWebKit")>-1;
var UA_MOZ		= (!UA_OPERA) && (!UA_SAFARI) && _nua.indexOf("Gecko")>-1;
var UA_OTHER	= !(UA_MSIE || UA_SAFARI || UA_OPERA || UA_MOZ);

var OS_WIN		= _nua.toLowerCase().indexOf("win")>-1;
var OS_MAC		= _nua.toLowerCase().indexOf("mac")>-1;
var OS_OTHER	= !(OS_WIN || OS_MAC);


// ==================================================================
// Constants altering system behaviour
// ==================================================================
var JSF_EXC_SHOW_ALL_EXCEPTIONS		= false;


// ==================================================================
// Base object additions
// ==================================================================
String.prototype.trim = function() {
	if(! this.length) return "";
	return this.replace(/^[ \t\n]*/, "").replace(/[ \t\n]*$/, "");
};

String.prototype.capitalize = function() {
	return this.substr(0,1).toUpperCase() + this.substr(1).toLowerCase();
};

String.prototype.times = function(nr) {
	var at = "";
	for(var ix=0; ix<nr; ++ix)
		at += this;
	return at;
};

Function.prototype.bind = function(thisValue) {
	var thisFunc = this;
	return function(){ return thisFunc.apply(thisValue, arguments); };
};

if(typeof(Array.prototype.indexOf) != "function")
	Array.prototype.indexOf = function(searchVal, startIndex) {
		if(arguments.length == 0) E_Raise("You must specify a search value as the 1st argument");
		if(null == startIndex) startIndex = 0;
		if(typeof(startIndex) != "number") E_Raise("Optional 2nd argument must be a number");
		startIndex = Math.floor(startIndex);
	
		if(this.length == 0) return -1;
		if(startIndex >= this.length) return -1;
		if(startIndex < 0) startIndex = Math.max(0, this.length + startIndex)

		for(var i = startIndex; i < this.length; ++i)
			if(this[i] === searchVal) return i;
		return -1;
	};

if(typeof(Array.prototype.lastIndexOf) != "function")
	Array.prototype.lastIndexOf = function(searchVal, startIndex) {
		if(arguments.length == 0) E_Raise("You must specify a search value as the 1st argument");
		if(null == startIndex) startIndex = this.length - 1;
		if(typeof(startIndex) != "number") E_Raise("Optional 2nd argument must be a number");
		startIndex = Math.floor(startIndex);
	
		if(this.length == 0) return -1;
		if(startIndex >= this.length) startIndex = this.length - 1;
		if(startIndex < 0) startIndex = this.length + startIndex;
		if(startIndex < 0) return -1;

		for(var i = startIndex; i >= 0; --i)
			if(this[i] === searchVal) return i;
		return -1;
	};



// ==================================================================
// Debug utilities
// ==================================================================
function DumpObj(o, m, t) {
	var i=0, max = m || 25, s="";
	try {
		for(var e in o) {
			try {
				if(!t || (typeof(o[e])==t)) { s += e + " = " + o[e] + "\n"; i++; }
			} catch(r) {
				s += e + ": EXCEPTION: " + r.message + "\n"; i++;
			}
			if(i==max) { alert(s); s=""; i=0; }
		}
	}
	catch(r) {
		E_Raise("Exception in enum! " + r.message);
	}
	finally {
		if(i) alert(s);
	}
}

function DumpObjToString(o, m, t) {
	var i=0, max = m || 25, s="";
	try {
		for(var e in o) {
			try {
				if(!t || (typeof(o[e])==t)) { s += e + " = " + o[e] + "\n"; i++; }
			} catch(r) {
				s += e + ": EXCEPTION: " + r.message + "\n"; i++;
			}
			if(i==max) return s;
		}
	}
	catch(r) {
		s += "Exception in enum! " + r.message;
	}
	finally {
		if(i) return s;
	}
}


// ==================================================================
// String manipulation tools
// ==================================================================
function InlineJString(s) {
	return s.replace(/(['"])/g, function(A,m1){ return "\\"+m1; }).replace(/\r\n|\n|\r/g, "\\n");
}

function Trim(s) { /* old version for backward compat, use strobj.trim() instead */
	return (typeof(s) == "string") ? s.trim() : "";
}

function PadLeft(s, minlen, padstr) {
	while(s.length < minlen) s = padstr + s;
	return s;
}

function PadRight(s, minlen, padstr) {
	while(s.length < minlen) s = s + padstr;
	return s;
}

function ParsePropertyList(list, itemsep, valuesep) {
	var props = {}, pairs, i;

	list = list.trim(); if(0==list.length) return props;
	pairs = list.split(itemsep);

	for(i=0; i<pairs.length; i++) {
		var curprop = pairs[i].trim(), vs, temp;
		if(0==curprop.length) continue;

		vs = curprop.indexOf(valuesep);
		if(0==vs) curprop = curprop.substr(valuesep.length);
		if(vs > -1) {
			temp = curprop.substr(0, vs).trim();
			props[temp] = curprop.substr(vs+valuesep.length).trim();
		} else
			props[curprop] = curprop;
	}
	return props;
}

function BuildPropertyList(object, itemsep, valuesep, encodeValues) {
	var plist = "";
	if(null == encodeValues) encodeValues = true;
	var encFunc = encodeValues ? encodeURIComponent : (function(v){return v;});

	C_ForEach(object, function(v, k) {
		if(plist.length) plist += itemsep;
		plist += k + valuesep + encFunc(v);
	});

	return plist;
}


// ==================================================================
// [Core] Object and array manipulation tools
// ==================================================================
function C_ForEach(oa, lambda, thisObj) {
	if(null == oa) return;
	var i;
	if(thisObj) lambda = lambda.bind(thisObj);
	if(null != oa.length) {
		for(i=0; i<oa.length; ++i) lambda(oa[i], i);
	} else {
		for(i in oa) lambda(oa[i], i);
	}
	return oa;
}

function C_MutateEach(oa, lambda, thisObj) {
	if(null == oa) return;
	var i;
	if(thisObj) lambda = lambda.bind(thisObj);
	if(null != oa.length) {
		for(i=0; i<oa.length; ++i) oa[i] = lambda(oa[i], i);
	} else {
		for(i in oa) oa[i] = lambda(oa[i], i);
	}
	return oa;
}

function C_MutateEachCopy(oa, lambda, thisObj) {
	if(null == oa) return;
	var i, dup;
	if(thisObj) lambda = lambda.bind(thisObj);
	if(null != oa.length) {
		dup = []; for(i=0; i<oa.length; ++i) dup[i] = lambda(oa[i], i);
	}
	else {
		 dup = {}; for(i in oa) dup[i] = lambda(oa[i], i);
	}
	return dup;
}

function C_ContainsKey(arr, key) {
	var contains = false;
	C_ForEach(arr, function(v,k){ if(k==key) contains = true; });
	return contains;
}

function C_ContainsValue(arr, val) {
	var contains = false;
	C_ForEach(arr, function(v,k){ if(v==val) contains = true; });
	return contains;
}


// ==================================================================
// [Core] Extended variable type information
// ==================================================================
function C_GetEntityType(ent) {
	if(null == ent)
		return "void";
	var type = typeof(ent);
	if(type == "object") {
		if(null != ent.nodeType) type = "element";
		else if(null != ent.document && null != ent.top) type = "window";
		else if(null != ent.constructor) {
			if(Array == ent.constructor) type = "array";
			else if(RegExp == ent.constructor) type = "regexp";
		}
	}
	return type;
}

function C_EntityAsString(ent) {
	var s = "???";
	switch(C_GetEntityType(ent)) {
		case "void":
			s = "void";
			break;
		case "number":
		case "boolean":
			s = "" + ent;
			break;
		case "string":
			s = "\"" + ent + "\"";
			break;
		case "function":
			s = "[function " + (C_GetFunctionSpec(ent).name || "anonymous") + "]";
			break;
		case "object":
			var con = (null!=ent.constructor && typeof(ent.constructor)=="function")?(C_GetFunctionSpec(ent.constructor).name):"";
			if(con.length) con = " " + con;
			s = "[object" + con + "]";
			break;
		case "element":
			var nam = D_GetElemIDOrName(ent);
			if(nam.length) nam = " " + nam;
			s = "[element" + nam + "]";
			break;
		case "window":
			var ttl = (null!=ent.document)?(ent.document.title):"";
			if(ttl.length) ttl = " " + ttl;
			s = "[window" + ttl + "]";
			break;
		case "array":
			s = "[array (" + ent.length + ")]";
			break;
		case "regexp":
			s = "[regexp]";
			break;
	}
	return s;
}


// ==================================================================
// [Core] Function and callstack tools
// ==================================================================
function C_GetFunctionSpec(fn) {
	if(arguments.length != 1 || typeof(fn)!="function") return("Invalid parameter list. Required: function");

	var i;
	var spec = {};
	var sfn = fn.toString();
	sfn = sfn.substring("function".length+1, sfn.indexOf(")")+1).trim();
	spec.name = sfn.substring(0, sfn.indexOf("(")).trim(); // can be empty
	spec.argnames = [];
	spec.argvals = [];
	var arglist = sfn.substring(sfn.indexOf("(")+1,sfn.length-1).split(",");
	for(i=0; i<arglist.length; i++)
		spec.argnames[i] = arglist[i].trim();
	spec.argformalcnt = i;

	if(fn.arguments) {
		for(i=0; i<fn.arguments.length; i++) {
			spec.argvals[i] = fn.arguments[i];
			if(i>=spec.argformalcnt) spec.argnames[i] = "";
		}
	} else
		i = -1;
	spec.argactualcnt = i;

	sfn = fn.toString();
	spec.body = sfn.substring(sfn.indexOf("{")+1, sfn.lastIndexOf("}"));

	spec.ToString = function() {
		var s = (this.name || "anonymous") + " (";
		for(var i=0; i<this.argnames.length; i++) {
			if(this.argnames[i]) {
				s += this.argnames[i];
				if(this.argactualcnt > -1) s += ": ";
			}
	
			if(this.argactualcnt > -1)
				s += (this.argactualcnt > i) ? C_EntityAsString(this.argvals[i]) : "void";

			if(i<this.argnames.length-1) s += ", ";
		}
		return s + ")";
	}

	return spec;
}

function C_TagObjectFunctions(obj, prefix) {
	if(UA_SAFARI || UA_OPERA) return;

	prefix = prefix.trim();
	C_MutateEach(obj, function(func, name) {
		if(typeof(func) != "function") return func;
		var spec = C_GetFunctionSpec(func);
		if(spec.name.length > 0) return func;
		try {
			eval("var nufunc = function " + prefix + name + "(" + spec.argnames.join(",") + ") {\n" + spec.body.trim() + "\n}");
		} catch(e) {
			return func;
		}
		return nufunc;
	});
}

function C_GetCallStack() {
	var s = "";
	var chk = {};
	var fn = arguments[0] || C_GetCallStack.caller;
	while(fn) {
		if(chk[fn]==1) {
			s += "[*] [Recursion used, cannot continue callstack trace.]"
			break;
		}
		chk[fn] = 1;
		
		if(typeof(fn) != "function") {
			// weird mozilla thingy
			break;
		}
		
		s += "[*] " + C_GetFunctionSpec(fn).ToString() + "\n";
		fn = fn.caller;
	}
	return s;
}

var __C_PATCH_COUNTER = 0;

function C_OverrideMethod(object, methodName, patchFunc) {
	var origFunc = object[methodName];
	if(typeof(origFunc) != "function") E_Raise("Method " + methodName + " does not exist in object " + C_EntityAsString(object));

	var origfs = C_GetFunctionSpec(origFunc);
	var patchfs = C_GetFunctionSpec(patchFunc);

	var args = origfs.argnames.join(",");
	var callargs = "";
	for(var i=0; i<origfs.argnames.length; ++i) { if(callargs.length) callargs += ","; callargs += "arguments[" + i + "]"; }
	
	var saveName = methodName + "_" + __C_PATCH_COUNTER;
	object[saveName] = origFunc;

	object[methodName] = new Function(args,
		"var self=this; function Inherited(){ return self[\"" + saveName + "\"](" + callargs + "); }\n" + patchfs.body);

	++__C_PATCH_COUNTER;
}


// ==================================================================
// [Exceptions] Creation and handling of standard exceptions
// ==================================================================
var __E_Raise_Recurse_Protect = 0;

function E_Raise(src) {
	__E_Raise_Recurse_Protect++;
	if(__E_Raise_Recurse_Protect > 1) {
		alert("E_Raise recursion detected !\nsrc = " + src);
		__E_Raise_Recurse_Protect--;
		return;
	}

	var e = "[!] An exception was raised by ";
	var raiser = E_Raise.caller;
	if(null==raiser)
		e += "a top level script.";
	else
		e += "function " + C_GetFunctionSpec(raiser).name + ".";
	e += "\n\n";

	if(typeof(src)=="object")
		e += "An " + C_EntityAsString(src) + " was passed:\n" + DumpObjToString(src, 10) + "\n";
	else
		e += "A " + C_GetEntityType(src) + " was passed:\n" + C_EntityAsString(src) + "\n\n";

	e += "Call stack:\n";
	if(raiser)
		e += C_GetCallStack(raiser);
	else
		e += "  [not available]";

	__E_Raise_Recurse_Protect--;

	if(JSF_EXC_SHOW_ALL_EXCEPTIONS) alert(e);
	if(window.Error) throw new Error(e);
}


// ==================================================================
// [DOM] Standard element accesses in a document or sub-element.
// D_Elem raises an exception if element is not found in target 
// document. Use D_ElemUnsafe if you just want it to return null.
// ==================================================================
function D_Elem(elemOrID, cont) {
	var doc = cont || document;
	if(null == doc.getElementById)
		E_Raise("The (passed) container is not a valid document object.");

	if(typeof(elemOrID) == "string") {
		elemOrID = elemOrID.trim();
		var e = doc.getElementById(elemOrID);
		if(!e) E_Raise("Element \"" + elemOrID + "\" does not exist.");
	} else
		return elemOrID;
	return e;
}

function D_ElemUnsafe(elemOrID, cont) {
	var doc = cont || document;
	if(null == doc.getElementById)
		E_Raise("The (passed) container is not a valid document object.");

	if(typeof(elemOrID) == "string")
		return doc.getElementById(elemOrID.trim());
	else
		return elemOrID;
}

function D_ElemsOfType(type, cont) {
	type = type.trim();
	var doc = cont || document;
	if(null==doc.getElementsByTagName)
		E_Raise("The (passed) object is not a valid element container.");

	var elems = doc.getElementsByTagName(type);

	if(("*"==type) && (0==elems.length)) {
		var i;
		elems = [];
		var base = doc; var todo = [], todoidx = -1;
		while(base) {
			if(base.childNodes && base.childNodes.length) {
				for(i=0; i<base.childNodes.length;i++)
					if(base.childNodes[i].nodeType == 1) {
						elems[elems.length] = base.childNodes[i];
						todo[++todoidx] = base.childNodes[i];
					}
			}
			base = (todoidx>-1)?todo[todoidx--]:null;
		}
	}

	return elems;
}

function D_GetElemIDOrName(elem) {
	var name = "";
	if(elem.id && elem.id.length)
		name = elem.id;
	else if(elem.name && elem.name.length)
		name = elem.name;
	return name;
}

function D_IsChildOf(child, parent) {
	do {
		if((child = child.parentNode) && child == parent) return true;
	} while(child);
	return false;
}


// ==================================================================
// [DOM] Event handling
// ==================================================================
function D_AddEvent(elemOrID, evtName, handler, thisObj) {
	var el = D_Elem(elemOrID);
	
	if(thisObj) handler = handler.bind(thisObj);
	evtName = evtName.toLowerCase().trim();
	if(evtName.substr(0,2) == "on") evtName = evtName.substr(2);

	var preprocessor = function() {
		var evt = arguments[0] || window.event;
		var tgt = evt.target || evt.srcElement;
		if(tgt && tgt.nodeType == 3) tgt = tgt.parentNode;
		return handler(evt, evtName, tgt);
	};

	if(el.addEventListener)
		el.addEventListener(evtName, preprocessor, false);
	else if(el.attachEvent)
		el.attachEvent("on" + evtName, preprocessor);
}

function D_CancelEvent(evt) {
	if(evt.preventDefault) evt.preventDefault();
	if(evt.stopPropagation) evt.stopPropagation();
	evt.cancelBubble = true;
	evt.returnValue = false;
}


// ==================================================================
// [DOM] Standardized IFrame functions
// ==================================================================
function D_GetIFrameDocument(ifraID) {
	var ifra = D_Elem(ifraID);
	if(ifra.tagName.toLowerCase() != "iframe") E_Raise("Element with id = '" + ifraID + "' is NOT an iframe!");

	if(null != ifra.contentWindow) return ifra.contentWindow.document;
	if(null != ifra.contentDocument) return ifra.contentDocument;

	return null;
}

function D_GetIFrameWindow(ifraID) {
	var ifra = D_Elem(ifraID);
	if(ifra.tagName.toLowerCase() != "iframe") E_Raise("Element with id = '" + ifraID + "' is NOT an iframe!");

	return ifra.contentWindow || null;
}

function D_SetIFrameLocation(ifraID, url, replace) {
	var ifra = D_GetIFrameDocument(ifraID);
	if(!ifra && UA_SAFARI) { setTimeout(function(){ if(!arguments[3]) D_SetIFrameLocation(ifraID, url, replace, true); }, 50); return; }

	// -- explicitly supply referring domain + path for mixed external/ABL site solutions
	if(!url.match(/^http(s)?\:/)) {
		var qmark = location.href.indexOf("?");
		var idx = location.href.lastIndexOf("/");
		if(idx > qmark) idx = location.href.substr(0, qmark).lastIndexOf("/");

		url = location.href.substr(0, idx + 1) + url;
	}

	if(replace || false) ifra.location.replace(url);
	else ifra.location.href = url;
}


// ==================================================================
// [DOM] CSS helpers
// ==================================================================
function D_UsesCSSClass(elemOrID, className) {
	var elem = D_Elem(elemOrID);
	return (" " + elem.className.trim() + " ").indexOf(" " + className.trim() + " ") > -1;
}

function D_AddCSSClass(elemOrID, className) {
	var elem = D_Elem(elemOrID);
	className = className.trim();
	if(D_UsesCSSClass(elem, className)) return false;
	elem.className += " " + className;
	return true;
}

function D_RemoveCSSClass(elemOrID, className) {
	var elem = D_Elem(elemOrID);
	className = className.trim();
	if(! D_UsesCSSClass(elem, className)) return false;
	elem.className = elem.className.replace(className, "").replace(/\s+/g, " ").trim();
	return true;
}

function D_ReplaceCSSClass(elemOrID, fromClass, toClass) {
	if(D_RemoveCSSClass(elemOrID, fromClass)) D_AddCSSClass(elemOrID, toClass);
}

window.JSF_CORE_LOADED = true;
