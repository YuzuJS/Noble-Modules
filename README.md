Noble Modules
=============
**A NobleJS production**

Copyright © 2011 Barnesandnoble.com llc. Released under the [MIT License][1].


Introduction
------------

Noble Modules is an implementation of the [CommonJS][2] [Modules/2.0 draft specification][3].

Modules/2.0 is designed to enable the creation of JavaScript modules in the same style as [Modules/1.1][4], which was
popularized by [Node][5]'s module implementation. However, unlike Modules/1.1, Modules/2.0 was built from the ground
up to support the browser.

Environment
-----------

Noble Modules was constructed to work in modern browser environments. It uses ECMAScript 5 features heavily, and
assumes browsers follow [the HTML5 standard][6] when it comes to script loading and the events that accompany that
process.

Unfortunately, many browsers in use today (the most relevant, perhaps, being Internet Explorer 8 and Safari 5) do not
completely support ECMAScript 5. And Internet Explorer has always had [a nonstandard script-loading implementation][7];
even Internet Explorer 10 (platform preview 1) does not rectify this situation. Fortunately, these problems are 
not insurmountable: the former can be overcome with the [es5-shim][8] library, and the latter by using the
included `nobleModulesInIE.js` module provider plug-in described below.

The unit tests for Noble Modules are known to all pass in the following browsers:

 * Chrome ≥12
 * Firefox ≥4 (with failures when run on the filesystem instead of on HTTP, due to [bug #621276][9])
 * Safari ≥5 (with es5-shim)
 * Internet Explorer ≥9 (with `nobleModulesInIE.js`)

Plug-ins and Other Extras
--------

We bundle two module provider plug-ins with Noble Modules:

 * `naked.js` allows the use of "naked" module files, i.e. those consisting only of module code sections (in the
   style of Modules/1.1). It uses `XMLHTTPRequest` (via jQuery) to load the file contents, parses out `require`
   calls, and uses them to wrap the module code section inside a Modules/2.0 `module.declare` call before using
   `eval` to introduce the module into the environment. It uses [the `//@ sourceURL` annotation][10] for easier
   debugging.
 * `nobleModulesInIE.js` allows Noble Modules to work in Internet Explorer by using the same technique, although 
   without the `require`-parsing and wrapper construction. This allows the core `nobleModules.js` code to stay clean 
   for those who do not need to support Internet Explorer's degenerate script-loading implementation.

Additionally, Noble Modules automatically memoizes a `nobleModules` module which has several methods useful for
debugging or other special requirements:

 * `require("nobleModules").setDebugOptions({ disableCaching, warnAboutUndeclaredDependencies })`
 * `require("nobleModules").reset({ mainModuleDirectory, withDebugOptions, keepPluginOverrides })`

Finally, an extensive suite of [QUnit][11] tests is included for your perusal.

Comparison to Existing Implementations
--------------------------------------

Noble Modules has several advantages over existing implementations of the Modules/2.0 spec:

 * It takes care not to pollute the global scope (which is kind of the whole point of a JavaScript module system):
   there is no `nobleModules` global!
 * It does not provide the same module twice, i.e. only a single `<script>` tag is ever inserted for a given module.
 * It properly parses relative module identifiers, instead of always taking them to be relative to the main module.
 * It has a strong focus on guiding its users toward [the pit of success][12], for example using ECMAScript 5 features
   to provide a secure environment and validating arguments passed to it in order to fail fast if used incorrectly.
 * Attempts were made to produce highly readable and commented code explaining the more tricky subtleties of
   module-loading, so that others can read, understand, and use Noble Modules with confidence.

For those familiar with the intricacies of writing a JavaScript module system, the following points will also be of
interest:

 * It uses `module.provide` to give the module loading system, or any of its provider plug-ins, a chance to provide
   dependencies even to modules memoized with `require.memoize`. (This is to fix [a recently-discovered hole in the
   specification][13].)
 * It follows the spec more strictly than other implementations; for example `module.load` does not memoize the 
   module (making it easier to use or override when writing module provider plug-ins), and `require.memoize` throws 
   an error if the module is already provided.

About Us
--------

[NobleJS][14] is a team of JavaScript programmers working on the desktop eReader team at [Barnesandnoble.com][15]. We
get to work on a large desktop application, built entirely in HTML5 and running inside a custom WebKit shell. If you 
like what you see, we'd love to have you [join us][16] so we can continue building a great team of top-class HTML5 
application developers. And keep an eye out as we move more and more of our stuff onto GitHub!

The primary contributors to Noble Modules are [Paul Bouzakis][17] and [Domenic Denicola][18]. Special thanks goes out 
to [Donavon West][19] (development manager), for his support and enthusiasm as we hacked away at producing a robust 
JavaScript module system we could use to build our product.

[1]: https://github.com/NobleJS/Noble-Modules/blob/master/MIT-LICENSE.txt
[2]: http://www.commonjs.org/
[3]: http://www.page.ca/~wes/CommonJS/modules-2.0-draft8/commonjs%20modules%202.0-8%282%29.pdf
[4]: http://wiki.commonjs.org/wiki/Modules/1.1.1
[5]: http://nodejs.org/
[6]: http://www.whatwg.org/specs/web-apps/current-work/multipage/scripting-1.html#script
[7]: http://unixpapa.com/js/dyna.html
[8]: https://github.com/kriskowal/es5-shim
[9]: https://bugzilla.mozilla.org/show_bug.cgi?id=621276
[10]: http://blog.getfirebug.com/2009/08/11/give-your-eval-a-name-with-sourceurl
[11]: http://docs.jquery.com/QUnit
[12]: http://www.codinghorror.com/blog/2007/08/falling-into-the-pit-of-success.html
[13]: http://groups.google.com/group/commonjs/browse_thread/thread/53057f785c6f5ceb
[14]: https://github.com/NobleJS
[15]: http://www.barnesandnoble.com/
[16]: http://go.bn.com/3rd
[17]: http://www.paulbouzakis.com/
[18]: http://domenicdenicola.com
[19]: http://blog.donavon.com/
