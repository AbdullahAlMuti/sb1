// listing_card_injector.js — SB1 Grabley-style compact product info card
// Runs on both listing/search pages AND individual product detail pages.
// Upload  → chrome.runtime.sendMessage({ action:'import_ebay', product })
// Bulk +  → chrome.storage.local 'sb1BulkQueue' array

(function () {
  'use strict';

  if (window.__SB1_LISTING_CARD_INIT__) return;
  window.__SB1_LISTING_CARD_INIT__ = true;

  const CardCore = window.SSListingCardCore;
  if (!CardCore) {
    console.error('[SellerSuit] Listing card core is unavailable; skipping card injection.');
    return;
  }

  // ─── Inline SVGs ──────────────────────────────────────────────────────────
  const SVG = {
    ebay: `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0.359 21.68880147788684 251.28199999999998 282.31119852211316" class="sb1c-svg-icon sb1c-svg-ebay"><path d="M152.338 157.13a70.327 70.327 0 1 0-53.8 1.662l6.788-17.937a51.149 51.149 0 1 1 39.128-1.209z" fill="#414141"/><path d="M.359 98.405h57.11V304h-39.11c-9.941 0-18-8.059-18-18z" fill="#ea323c"/><path d="M251.641 98.405h-57.109V304h39.109c9.941 0 18-8.059 18-18z" fill="#88b621"/><path d="M194.531 98.405H126V304h68.531z" fill="#f5ae03"/><path d="M126 98.405H57.468V304H126z" fill="#0064d1"/></svg>`,
    walmart: `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" id="walmart" x="0" y="0" style="enable-background:new 0 0 532.262 600" version="1.1" viewBox="0 0 532.262 600" class="sb1c-svg-icon sb1c-svg-walmart"><g><path d="M375.663 273.363c12.505-2.575 123.146-53.269 133.021-58.97 22.547-13.017 30.271-41.847 17.254-64.393s-41.847-30.271-64.393-17.254c-9.876 5.702-109.099 76.172-117.581 85.715-9.721 10.937-11.402 26.579-4.211 39.033C346.945 269.949 361.331 276.314 375.663 273.363zM508.685 385.607c-9.876-5.702-120.516-56.396-133.021-58.97-14.332-2.951-28.719 3.415-35.909 15.87-7.191 12.455-5.51 28.097 4.211 39.033 8.482 9.542 107.705 80.013 117.581 85.715 22.546 13.017 51.376 5.292 64.393-17.254S531.231 398.624 508.685 385.607zM266.131 385.012c-14.382 0-27.088 9.276-31.698 23.164-4.023 12.117-15.441 133.282-15.441 144.685 0 26.034 21.105 47.139 47.139 47.139 26.034 0 47.139-21.105 47.139-47.139 0-11.403-11.418-132.568-15.441-144.685C293.219 394.288 280.513 385.012 266.131 385.012zM156.599 326.637c-12.505 2.575-123.146 53.269-133.021 58.97C1.031 398.624-6.694 427.454 6.323 450c13.017 22.546 41.847 30.271 64.393 17.254 9.876-5.702 109.098-76.172 117.58-85.715 9.722-10.937 11.402-26.579 4.211-39.033S170.931 323.686 156.599 326.637zM70.717 132.746C48.171 119.729 19.341 127.454 6.323 150c-13.017 22.546-5.292 51.376 17.254 64.393 9.876 5.702 120.517 56.396 133.021 58.97 14.332 2.951 28.719-3.415 35.91-15.87 7.191-12.455 5.51-28.096-4.211-39.033C179.815 208.918 80.592 138.447 70.717 132.746zM266.131 0c-26.035 0-47.139 21.105-47.139 47.139 0 11.403 11.418 132.568 15.441 144.685 4.611 13.888 17.317 23.164 31.698 23.164s27.088-9.276 31.698-23.164c4.023-12.117 15.441-133.282 15.441-144.685C313.27 21.105 292.165 0 266.131 0z" style="fill:#ffc220"/></g></svg>`,
    amazon: `<svg viewBox="0 0 122.879 111.709" class="sb1c-svg-icon sb1c-svg-amazon" xml:space="preserve"><g><path fill="#000" d="M33.848,54.85c0-5.139,1.266-9.533,3.798-13.182c2.532-3.649,5.995-6.404,10.389-8.266 c4.021-1.713,8.974-2.941,14.858-3.687c2.01-0.223,5.287-0.521,9.83-0.894v-1.899c0-4.766-0.521-7.968-1.564-9.607 c-1.564-2.235-4.021-3.351-7.373-3.351h-0.893c-2.458,0.223-4.581,1.005-6.368,2.345c-1.787,1.341-2.942,3.202-3.463,5.586 c-0.298,1.489-1.042,2.345-2.234,2.569l-12.847-1.564c-1.266-0.298-1.899-0.968-1.899-2.011c0-0.223,0.037-0.484,0.111-0.781 c1.266-6.628,4.375-11.543,9.328-14.746C50.473,2.161,56.264,0.373,62.893,0h2.793c8.488,0,15.117,2.197,19.885,6.591 c0.746,0.748,1.438,1.55,2.066,2.401c0.631,0.856,1.135,1.62,1.506,2.29c0.373,0.67,0.709,1.639,1.006,2.904 c0.299,1.267,0.521,2.142,0.672,2.625c0.148,0.484,0.26,1.527,0.334,3.129c0.074,1.601,0.111,2.55,0.111,2.848v27.034 c0,1.936,0.279,3.705,0.838,5.306c0.559,1.602,1.1,2.756,1.619,3.463c0.521,0.707,1.379,1.844,2.57,3.406 c0.447,0.672,0.67,1.268,0.67,1.789c0,0.596-0.297,1.115-0.895,1.563c-6.18,5.363-9.531,8.268-10.053,8.715 c-0.893,0.67-1.973,0.744-3.24,0.223c-1.041-0.895-1.953-1.75-2.736-2.57c-0.781-0.818-1.34-1.414-1.676-1.787 c-0.334-0.371-0.875-1.098-1.619-2.178s-1.268-1.807-1.564-2.178c-4.17,4.543-8.266,7.373-12.287,8.49 c-2.533,0.744-5.661,1.117-9.384,1.117c-5.735,0-10.445-1.77-14.131-5.307C35.691,66.336,33.848,61.328,33.848,54.85L33.848,54.85z M53.062,52.615c0,2.905,0.727,5.232,2.178,6.982c1.453,1.75,3.407,2.625,5.865,2.625c0.224,0,0.54-0.037,0.95-0.111 c0.408-0.076,0.688-0.113,0.838-0.113c3.127-0.818,5.547-2.828,7.26-6.031c0.82-1.415,1.434-2.96,1.844-4.636 c0.41-1.675,0.633-3.035,0.67-4.078c0.037-1.042,0.057-2.755,0.057-5.138v-2.793c-4.32,0-7.596,0.298-9.83,0.894 C56.338,42.077,53.062,46.21,53.062,52.615L53.062,52.615z"/><path fill="#FF9900" d="M99.979,88.586c0.15-0.299,0.373-0.596,0.672-0.895c1.861-1.266,3.648-2.121,5.361-2.568 c2.83-0.744,5.586-1.154,8.266-1.229c0.746-0.076,1.453-0.037,2.123,0.111c3.352,0.297,5.361,0.857,6.033,1.676 c0.297,0.447,0.445,1.117,0.445,2.01v0.783c0,2.605-0.707,5.678-2.121,9.215c-1.416,3.537-3.389,6.387-5.922,8.547 c-0.371,0.297-0.707,0.445-1.004,0.445c-0.15,0-0.299-0.037-0.447-0.111c-0.447-0.223-0.559-0.633-0.336-1.229 c2.756-6.479,4.133-10.984,4.133-13.518c0-0.818-0.148-1.414-0.445-1.787c-0.746-0.893-2.83-1.34-6.256-1.34 c-1.268,0-2.756,0.074-4.469,0.223c-1.861,0.225-3.574,0.447-5.139,0.672c-0.447,0-0.744-0.076-0.895-0.225 c-0.148-0.148-0.186-0.297-0.111-0.447C99.867,88.846,99.904,88.734,99.979,88.586L99.979,88.586z M0.223,86.688 c0.373-0.596,0.968-0.633,1.788-0.113c18.618,10.799,38.875,16.199,60.769,16.199c14.598,0,29.008-2.719,43.232-8.156 c0.371-0.148,0.912-0.371,1.619-0.67c0.709-0.297,1.211-0.521,1.508-0.67c1.117-0.447,1.992-0.223,2.625,0.67 c0.635,0.895,0.43,1.713-0.613,2.457c-1.342,0.969-3.055,2.086-5.139,3.352c-6.404,3.799-13.555,6.74-21.449,8.826 c-7.893,2.086-15.602,3.127-23.123,3.127c-11.618,0-22.603-2.029-32.954-6.088C18.134,101.563,8.862,95.846,0.67,88.475 C0.223,88.102,0,87.729,0,87.357C0,87.133,0.074,86.91,0.223,86.688L0.223,86.688z"/></g></svg>`,
    aliexpress: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="sb1c-svg-icon sb1c-svg-aliexpress"><path d="M6 118.468C6 56.356 56.356 6 118.468 6H393.53C455.643 6 506 56.356 506 118.468V393.53C505.999 455.643 455.643 506 393.53 506H118.468C56.356 505.999 6 455.643 6 393.53V118.468z" fill="#f90" fill-rule="nonzero"/><path d="M6 159.843c0-50.206 40.7-90.906 90.912-90.906h318.18c50.207 0 90.907 40.7 90.907 90.906V393.53C505.999 455.643 455.643 506 393.53 506H118.468C56.356 505.999 6 455.643 6 393.53V159.843z" fill="#e43225" fill-rule="nonzero"/><path d="M145.28 149.78c1.888 7.7.826 16.013 2.676 23.838 6.469-4.731 10.775-12.543 9.894-20.68-.132-14.563-16.513-25.976-30.22-21.076-8.618 2.463-14.993 10.2-16.437 18.938-1.725 10.006 4.282 20.237 13.22 24.812-.882-8.619-2.957-17.706-.638-26.137 3.537-9.194 18.23-9.007 21.506.306zm255.056 10.438c3.144-11.3-3.693-24.4-14.9-28.018-10.774-4.232-24.112 1.156-28.862 11.656-5.294 9.719-2.094 23.55 7.588 29.244 1.912-7.8.5-16.163 2.768-23.744 3.619-9.056 18.131-8.794 21.431.387 2.1 8.207.2 16.825-.593 25.106 6.575-2.03 10.675-8.312 12.562-14.606l.006-.025z" fill="#b32100" fill-rule="nonzero"/><path d="M366.962 149.35c-2.282 7.662-.87 15.95-2.77 23.75-5.637 33.862-28.312 64.13-59.012 79.3a109.319 109.319 0 01-98.506-.126c-30.418-15.13-52.912-45.143-58.693-78.643-1.85-7.838-.8-16.063-2.681-23.838-3.263-9.237-17.963-9.506-21.507-.312-2.306 8.512-.23 17.531.644 26.137 6.463 41.875 34.481 79.475 72.437 98.138a133.42 133.42 0 0056.032 13.8 133.357 133.357 0 0056.612-11.138c41.05-17.725 71.737-57.312 78.3-101.6.793-8.281 2.693-16.906.587-25.106-3.312-9.181-17.812-9.431-21.437-.381l-.006.019zM164.893 391.061v-56.324h33.294v7.062h-26.4v17.319h23.712v7.062h-23.712v17.656h28.25v7.063h-35.144v.162zM235.018 391.061L223.587 376.1l-11.438 14.962h-8.068l15.637-20.006-16.481-20.68h9.081l11.269 15.468 11.431-15.469h8.913l-15.638 20.681 14.794 20.006h-8.069zM254.18 385.011v27.744h-6.893v-41.531c0-10.594 8.069-21.862 20.681-21.862 12.781 0 22.362 8.075 22.362 21.356 0 12.95-9.75 21.856-20.85 21.856-5.38 0-12.612-2.35-15.3-7.563zm28.92-14.293c0-9.081-5.882-14.463-16.307-13.956-5.044.168-12.781 3.868-12.106 16.812.169 4.206 4.537 12.106 14.125 12.106 8.237 0 14.287-4.706 14.287-14.962zM296.218 350.374h6.894v4.369c3.362-3.869 8.575-5.213 14.125-5.213v7.4c-.838-.168-9.082-1.175-14.125 9.582v24.718h-6.894v-40.856zM319.087 370.718c0-11.769 8.406-21.356 20.012-21.356 14.456 0 19.838 9.587 19.838 21.862v3.363h-32.282c.507 7.73 7.4 11.768 13.788 11.6 4.706-.17 7.9-1.513 11.262-4.876l4.544 4.707c-4.206 4.037-9.587 6.725-16.144 6.725-12.275-.169-21.018-9.244-21.018-22.025zm19.506-14.463c-6.556 0-11.6 5.719-11.938 11.938h25.05c0-6.05-4.368-11.938-13.112-11.938zM362.468 385.349l5.05-4.544c-.169 0 2.519 2.694 2.856 2.863 1.175 1.006 2.35 1.681 3.869 2.018 4.368 1.175 12.275.838 12.943-5.212.338-3.363-2.18-5.213-5.043-6.394-3.7-1.343-7.731-1.85-11.431-3.531-4.2-1.85-6.894-5.044-6.894-9.75 0-12.275 17.487-14.294 25.387-8.575.338.338 4.2 3.869 4.038 3.869l-5.044 4.031c-2.525-3.025-4.881-4.537-10.263-4.537-2.687 0-6.387 1.175-7.056 4.037-1.012 4.031 3.532 5.544 6.556 6.388 4.038 1.006 8.407 1.68 11.938 3.868 4.875 3.025 6.056 9.581 4.206 14.625-2.019 5.55-8.075 7.738-13.456 7.906-6.387.332-11.937-1.68-16.475-6.225-.337 0-1.181-.837-1.181-.837zM397.949 385.349l5.044-4.544c-.17 0 2.525 2.694 2.862 2.863 1.175 1.006 2.35 1.681 3.863 2.018 4.375 1.175 12.275.838 12.95-5.212.337-3.363-2.188-5.213-5.044-6.394-3.7-1.343-7.738-1.85-11.438-3.531-4.2-1.85-6.893-5.044-6.893-9.75 0-12.275 17.487-14.294 25.393-8.575.338.338 4.2 3.869 4.032 3.869l-5.044 4.031c-2.519-3.025-4.875-4.537-10.256-4.537-2.688 0-6.388 1.175-7.063 4.037-1.006 4.031 3.531 5.544 6.563 6.388 4.03 1.006 8.406 1.68 11.937 3.868 4.875 3.025 6.05 9.581 4.2 14.625-2.012 5.55-8.069 7.738-13.45 7.906-6.387.332-11.937-1.68-16.481-6.225-.331 0-1.175-.837-1.175-.837zM430.73 350.368v-4.369h-1.512v-.844h4.037V346h-1.519v4.369h-1.006zM438.293 350.368v-4.031l-1.513 4.03h-.337l-1.513-4.03v4.03h-.844v-5.212h1.35l1.344 3.532 1.344-3.532h1.344v5.213h-1.175zM118.143 391.061l-5.043-13.45H85.862l-5.044 13.45h-7.23l21.855-56.324h7.907l21.687 56.324h-6.894zm-19-48.256l-10.256 27.913h21.356l-11.1-27.913zM129.58 334.737h7.063v56.33h-7.062zM147.237 351.212h7.063v39.85h-7.063zM161.03 338.268v-.675c-5.38-.169-9.755-4.538-9.924-9.919H150.1c-.17 5.381-4.544 9.75-9.92 9.919v.675c5.376.169 9.75 4.537 9.92 9.919h1.006c.169-5.382 4.544-9.75 9.925-9.92z" fill="#fff" fill-rule="nonzero"/></svg>`,
    temu: `<svg viewBox="0 0 256 256" class="sb1c-svg-icon sb1c-svg-temu"><g fill="#f50017" fill-rule="nonzero"><g transform="scale(5.12,5.12)"><path d="M15,5c-5.514,0 -10,4.486 -10,10v20c0,5.514 4.486,10 10,10h20c5.514,0 10,-4.486 10,-10v-20c0,-5.514 -4.486,-10 -10,-10zM18.59961,15.99805l0.56836,0.00977c0.748,0.623 1.29617,1.28833 1.70117,1.98633h0.56836c0.361,-0.102 0.67527,-0.2495 0.94727,-0.4375c0.114,-0.082 0.25858,-0.1065 0.39258,-0.0625c0.134,0.044 0.2392,0.14825 0.2832,0.28125c0.049,0.124 0.08008,0.21875 0.08008,0.21875c-0.003,0.191 -0.06964,0.3095 -0.18164,0.4375c-0.212,0.257 -0.25252,0.61511 -0.10352,0.91211c0.071,0.163 0.15338,0.34267 0.23438,0.51367c0.176,-0.025 0.36172,0.01672 0.51172,0.13672c0.29,0.231 0.33747,0.65531 0.10547,0.94531c-0.001,0 -1.11569,1.41339 -3.05469,1.40039c-0.008,0 -0.01544,-0.00095 -0.02344,-0.00195c-1.911,-0.082 -3.00781,-1.38281 -3.00781,-1.38281c-0.241,-0.282 -0.20778,-0.70627 0.07422,-0.94727c0.228,-0.195 0.54511,-0.20178 0.78711,-0.05078l0.40039,-1.39453c0,0 -0.10709,0.07206 -0.24609,0.16406c-0.353,0.235 -0.82205,0.18862 -1.12305,-0.10937c-0.041,-0.041 -0.083,-0.08205 -0.125,-0.12305c-0.306,-0.302 -0.35428,-0.77877 -0.11328,-1.13477c0.288,-0.406 0.66522,-0.84233 1.32422,-1.36133zM34.53516,16h3.90234c0.575,0 1.05709,0.43763 1.12109,1.01563c0.121,1.106 0.31455,2.86275 0.43555,3.96875c0.029,0.258 -0.05361,0.51794 -0.22461,0.71094c-0.171,0.194 -0.41488,0.30469 -0.67187,0.30469h-5.19531c-0.256,0 -0.49892,-0.11073 -0.66992,-0.30273c-0.171,-0.192 -0.25356,-0.44903 -0.22656,-0.70703c0.113,-1.102 0.29225,-2.8588 0.40625,-3.9668c0.06,-0.582 0.54505,-1.02344 1.12305,-1.02344zM30.02148,16.00195c0.562,-0.019 0.98087,0.45994 1.29688,0.83594c0.209,0.282 0.23912,0.6587 0.07813,0.9707c-0.015,0.029 -0.02892,0.05884 -0.04492,0.08984c-0.267,0.516 -0.40625,1.08892 -0.40625,1.66992v2.39648h-0.61719c0,-0.001 0.007,-1.49489 0,-2.08789c-0.006,-0.593 -0.30664,-0.5957 -0.30664,-0.5957c0,0 -0.79053,2.46859 -2.76953,2.68359c-0.943,0.102 -1.75652,-0.02764 -2.35352,-0.18164c-0.179,-0.057 -0.3035,-0.2202 -0.3125,-0.4082c-0.009,-0.188 0.09848,-0.36155 0.27148,-0.43555c0.789,-0.342 1.76172,-0.76367 1.76172,-0.76367l0.61523,0.29883c1.334,-0.272 1.84766,-1.78906 1.84766,-1.78906c0,0 -0.00055,-2.65259 0.93945,-2.68359zM10.43945,16.00781c0.791,-0.048 1.25203,0.11652 1.83203,0.60352c0.544,-0.428 0.99328,-0.65352 1.86328,-0.60352c0.068,0.754 -0.09824,1.45238 -0.61524,2.10938c0.77,1.267 1.19844,2.19363 1.52344,3.01562c0,0 -0.84048,1.26708 -2.77148,1.20508c-1.931,-0.062 -2.77148,-1.20508 -2.77148,-1.20508c0.528,-1.402 1.04564,-2.33563 1.55664,-3.01562c-0.451,-0.564 -0.58619,-1.27938 -0.61719,-2.10938zM35.2207,17.33789c-0.04214,-0.00716 -0.08661,-0.00684 -0.13086,0.00391c-0.177,0.043 -0.28614,0.22139 -0.24414,0.40039c0,0 0.12842,0.55505 0.48242,0.99805c0.262,0.328 0.6393,0.5918 1.1543,0.5918c0.515,0 0.8923,-0.2638 1.1543,-0.5918c0.354,-0.443 0.48438,-0.99805 0.48438,-0.99805c0.042,-0.179 -0.06714,-0.35839 -0.24414,-0.40039c-0.177,-0.042 -0.35448,0.06905 -0.39648,0.24805c0,0 -0.09547,0.40547 -0.35547,0.73047c-0.147,0.184 -0.35358,0.3457 -0.64258,0.3457c-0.289,0 -0.49363,-0.1607 -0.64062,-0.3457c-0.26,-0.325 -0.35547,-0.73047 -0.35547,-0.73047c-0.0315,-0.13425 -0.1392,-0.23048 -0.26562,-0.25195zM20.58594,20.26563c-0.355,-0.022 -0.68541,0.22228 -0.94141,0.48828c0.291,0.123 0.63406,0.22124 1.03906,0.24023c0.326,-0.001 0.61423,-0.06234 0.86523,-0.15234c-0.179,-0.238 -0.49689,-0.54717 -0.96289,-0.57617zM10,25h5c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-1.5v5c0,0.553 -0.447,1 -1,1c-0.553,0 -1,-0.447 -1,-1v-5h-1.5c-0.553,0 -1,-0.447 -1,-1c0,-0.553 0.447,-1 1,-1zM18,25h4c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-3v1h2.97461c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-2.97461v1h3c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-4c-0.553,0 -1,-0.447 -1,-1v-6c0,-0.553 0.447,-1 1,-1zM31.00586,25c0.10369,0.00066 0.20805,0.01653 0.31055,0.05078c0.409,0.137 0.68359,0.51822 0.68359,0.94922v6c0,0.553 -0.447,1 -1,1c-0.553,0 -1,-0.447 -1,-1v-3l-1.19922,1.59961c-0.188,0.252 -0.48383,0.39939 -0.79883,0.40039h-0.00195c-0.313,0 -0.60883,-0.14648 -0.79883,-0.39648l-1.21484,-1.60742l0.01367,3c0.002,0.552 -0.44214,1.00386 -0.99414,1.00586h-0.00586c-0.551,0 -0.998,-0.44409 -1,-0.99609l-0.02539,-6c-0.002,-0.43 0.27069,-0.81317 0.67969,-0.95117c0.406,-0.137 0.85519,-0.00125 1.11719,0.34375l2.22461,2.94141l2.20313,-2.93945c0.1935,-0.25875 0.49558,-0.40236 0.80664,-0.40039zM34,25h0.00391c0.553,0.002 0.99809,0.45191 0.99609,1.00391l-0.01562,3.47656c-0.002,0.406 0.15541,0.78822 0.44141,1.07422c0.282,0.283 0.67131,0.44531 1.07031,0.44531c0.829,0 1.50391,-0.67395 1.50391,-1.50195v-3.49805c0,-0.553 0.447,-1 1,-1c0.553,0 1,0.447 1,1v3.49805c0,1.931 -1.57095,3.50195 -3.50195,3.50195c-0.94,0 -1.82328,-0.3672 -2.48828,-1.0332c-0.664,-0.667 -1.02744,-1.55314 -1.02344,-2.49414l0.01367,-3.47656c0.002,-0.551 0.449,-0.99609 1,-0.99609z"></path></g></g></svg>`,
    alibaba: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="sb1c-svg-icon sb1c-svg-alibaba"><path d="M506 116v280c0 60.71-49.29 110-110 110H116C55.29 506 6 456.71 6 396V116C6 55.289 55.29 6 116 6h280c60.71 0 110 49.289 110 110z" fill="#ff5a00"/><path d="M310.05 143.5h15.694c22.062 1.25 45.487 5.35 63.056 19.794 14.031 11.362 19.975 30.787 16.531 48.287-2.644 13.057-8.662 25.094-15.144 36.6-13.143 22.775-29.3 43.563-44.674 64.838-2.75 3.519-4.907 7.825-4.625 12.406.25 3.631 3.03 6.575 6.293 7.869 6.319 2.569 13.313 2.062 19.957 1.694 20.993-2.2 41.225-8.57 61.25-14.957 1.525-.95 2.03.6 2.612 1.713-21.275 14.187-44.169 26.018-68.237 34.725-13.313 4.462-27.388 8.7-41.575 7.037-7.457-.744-14.932-5.187-17.27-12.618-2.893-9.675-1.83-20.394 2.357-29.538 6.369-14.281 16.25-26.55 25.625-38.938 15.538-20.368 31.575-40.624 43.775-63.262 4.031-8.031 8.331-17.781 4.331-26.644-3.775-8.175-11.968-12.987-19.818-16.618-13.932-6.232-28.794-9.982-43.444-14.144a575.641 575.641 0 00-6.6 4.394c5.094 3.887 10.187 7.78 15.231 11.737-19.281 3.475-38.494 7.363-57.475 12.2-28.912 7.175-57.131 16.781-85.094 26.969 2.732 5.437 5.438 10.9 8.032 16.412-6.32 6.988-12.594 14.05-18.913 21.044 15.188 4.538 31.55 5.163 47.038 1.731 13.243-2.962 25.693-9.306 35.812-18.356-2.756-3.425-6.231-6.181-9.981-8.45 12.294.256 23.475 10.975 23.5 23.406-2.406.013-4.8.032-7.175.044a49.042 49.042 0 00-2.181-7.894c-13.957 12.619-31.988 20.513-50.67 22.55-16.455 1.9-33.287-.368-48.774-6.156 1.044 9.581 2.087 19.119 3.056 28.7-8.794 3.425-16.969 8.381-24.281 14.356-5.813 5.069-11.575 10.9-13.794 18.494-2.131 6.688 1.338 14.281 7.194 17.869 7.106 4.4 15.394 6.437 23.594 7.619 10.806 1.412 21.73 1.293 32.587.53 21.319-1.574 42.388-5.58 63.125-10.6 2.063-.837 3.038 2.57.925 3.1-16.55 8.52-33.862 15.695-51.919 20.326-16.968 4.375-34.443 6.619-51.943 7.219-17.85-.55-36.807-4-50.95-15.694C86.58 344.775 81.044 331.256 81 317.856v-.718c.35-14.17 5.138-27.87 12.038-40.138 9.075-17.319 20.256-33.569 33.475-47.987 22.843-25.163 51.5-44.632 82.312-58.732 31.919-14.468 66.088-24.862 101.225-26.781z" fill="#fff" fill-rule="nonzero"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 467 512.22" class="sb1c-copy-svg"><path fill-rule="nonzero" d="M131.07 372.11c.37 1 .57 2.08.57 3.2 0 1.13-.2 2.21-.57 3.21v75.91c0 10.74 4.41 20.53 11.5 27.62s16.87 11.49 27.62 11.49h239.02c10.75 0 20.53-4.4 27.62-11.49s11.49-16.88 11.49-27.62V152.42c0-10.55-4.21-20.15-11.02-27.18l-.47-.43c-7.09-7.09-16.87-11.5-27.62-11.5H170.19c-10.75 0-20.53 4.41-27.62 11.5s-11.5 16.87-11.5 27.61v219.69zm-18.67 12.54H57.23c-15.82 0-30.1-6.58-40.45-17.11C6.41 356.97 0 342.4 0 326.52V57.79c0-15.86 6.5-30.3 16.97-40.78l.04-.04C27.51 6.49 41.94 0 57.79 0h243.63c15.87 0 30.3 6.51 40.77 16.98l.03.03c10.48 10.48 16.99 24.93 16.99 40.78v36.85h50c15.9 0 30.36 6.5 40.82 16.96l.54.58c10.15 10.44 16.43 24.66 16.43 40.24v302.01c0 15.9-6.5 30.36-16.96 40.82-10.47 10.47-24.93 16.97-40.83 16.97H170.19c-15.9 0-30.35-6.5-40.82-16.97-10.47-10.46-16.97-24.92-16.97-40.82v-69.78zM340.54 94.64V57.79c0-10.74-4.41-20.53-11.5-27.63-7.09-7.08-16.86-11.48-27.62-11.48H57.79c-10.78 0-20.56 4.38-27.62 11.45l-.04.04c-7.06 7.06-11.45 16.84-11.45 27.62v268.73c0 10.86 4.34 20.79 11.38 27.97 6.95 7.07 16.54 11.49 27.17 11.49h55.17V152.42c0-15.9 6.5-30.35 16.97-40.82 10.47-10.47 24.92-16.96 40.82-16.96h170.35z"/></svg>`,
    ok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" xml:space="preserve" class="sb1c-status-svg sb1c-svg-ok"><g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)"><path d="M 89.122 3.486 L 89.122 3.486 c -2.222 -3.736 -7.485 -4.118 -10.224 -0.742 L 33.202 59.083 c -1.118 1.378 -3.245 1.303 -4.262 -0.151 L 17.987 43.291 c -3.726 -5.322 -11.485 -5.665 -15.666 -0.693 l 0 0 c -2.883 3.428 -3.102 8.366 -0.533 12.036 L 24.206 86.65 c 2.729 3.897 8.503 3.89 11.222 -0.014 l 6.435 -9.239 L 88.87 10.265 C 90.28 8.251 90.378 5.598 89.122 3.486 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(6,188,66); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" /></g></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" baseProfile="basic" class="sb1c-status-svg sb1c-svg-error"><circle cx="8" cy="8" r="8" fill="#fe3155"/><polygon fill="#fff" points="11.536,10.121 9.414,8 11.536,5.879 10.121,4.464 8,6.586 5.879,4.464 4.464,5.879 6.586,8 4.464,10.121 5.879,11.536 8,9.414 10.121,11.536"/></svg>`,
    spinner: `<svg class="sb1c-spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#0071dc" stroke-width="5" stroke-dasharray="90, 150" stroke-dashoffset="-35"></circle></svg>`
  };

  // ─── Utilities ────────────────────────────────────────────────────────────
  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function safeText(el) {
    return el ? (el.textContent || el.innerText || '').trim() : '';
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildEbayUrl(title) {
    return CardCore.buildSearchUrl('ebay', title);
  }

  function buildWalmartUrl(title) {
    return CardCore.buildSearchUrl('walmart', title);
  }

  function buildAliUrl(title) {
    return CardCore.buildSearchUrl('aliexpress', title);
  }

  function buildTemuUrl(title) {
    return CardCore.buildSearchUrl('temu', title);
  }

  function buildAlibabaUrl(title) {
    return CardCore.buildSearchUrl('alibaba', title);
  }

  function getSupplierKey() {
    return CardCore.getMarketplace(location.hostname);
  }

  function getQid() {
    const m = /[?&]qid=(\d+)/.exec(location.search);
    return m ? m[1] : '';
  }

  // ─── Read UPC from DOM (Grabley's B() function) ───────────────────────────
  // Walks .prodDetSectionEntry rows looking for a "UPC" label.
  function readUpcFromDom(root) {
    const entries = (root || document).querySelectorAll('.prodDetSectionEntry');
    for (let i = 0; i < entries.length; i++) {
      const labelEl = entries[i].querySelector('th') || entries[i].querySelector('.prodDetSectionLabel');
      const valEl   = entries[i].querySelector('.prodDetAttrValue') || entries[i].querySelector('td');
      if (labelEl && valEl && labelEl.textContent.trim().toLowerCase() === 'upc') {
        const v = valEl.textContent.trim().split(/\s+/)[0];
        if (/^\d{6,14}$/.test(v)) return v;
      }
    }
    const rows = (root || document).querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td, th');
      if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === 'upc') {
        const v = cells[1].textContent.trim().split(/\s+/)[0];
        if (/^\d{6,14}$/.test(v)) return v;
      }
    }
    return '';
  }

  // ─── Read Brand from DOM (mirrors Grabley's brand extraction) ─────────────
  // Priority: .prodDetSectionEntry "Brand" row → .po-brand → #bylineInfo → #brand
  function readBrandFromDom(root) {
    const doc = root || document;

    // 1. Tech-details table "Brand" row (Grabley's B() approach)
    const BRAND_LABELS = ['brand','marke','marque','marka','marca','marchio','merk'];
    const entries = doc.querySelectorAll('.prodDetSectionEntry');
    for (let i = 0; i < entries.length; i++) {
      const labelEl = entries[i].querySelector('th') || entries[i].querySelector('.prodDetSectionLabel');
      const valEl   = entries[i].querySelector('.prodDetAttrValue') || entries[i].querySelector('td');
      if (labelEl && valEl && BRAND_LABELS.includes(labelEl.textContent.trim().toLowerCase())) {
        const v = valEl.textContent.trim();
        if (v && v.toLowerCase() !== 'does not apply') return v;
      }
    }

    // 2. .po-brand (product overview table)
    const poBrand = doc.querySelector('.po-brand .a-span9, .po-brand td:last-child');
    if (poBrand) { const t = safeText(poBrand); if (t) return t; }

    // 3. #bylineInfo
    const byline = doc.querySelector('#bylineInfo');
    if (byline) {
      const full = safeText(byline);
      const storeMatch = full.match(/visit the (.+?) store/i);
      if (storeMatch) return storeMatch[1].trim();
      const brandMatch = full.match(/brand[:\s]+(.+)/i);
      if (brandMatch) return brandMatch[1].split('\n')[0].trim();
      const byMatch = full.match(/^by\s+(.+)/i);
      if (byMatch) return byMatch[1].trim();
    }

    // 4. #brand anchor
    const brandEl = doc.querySelector('#brand');
    if (brandEl) { const t = safeText(brandEl); if (t) return t; }

    return '';
  }

  // ─── Rate-limited fetch queue (max FETCH_CONCURRENCY in-flight, abortable on navigation) ───
  function drainFetchQueue() {
    while (_fetchActive < FETCH_CONCURRENCY && _fetchQueue.length) {
      const { url, onResult } = _fetchQueue.shift();
      _fetchActive++;
      fetch(url, { credentials: 'include', signal: _fetchAbortCtrl.signal })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) { if (html) onResult(html); })
        .catch(function () {})
        .finally(function () { _fetchActive--; drainFetchQueue(); });
    }
  }

  function queuedFetch(url, onResult) {
    if (!url) return;
    _fetchQueue.push({ url, onResult });
    drainFetchQueue();
  }

  // ─── Amazon QTY: AOD fetch (queued, abortable) ─────────────────────────────
  function fetchAmazonQty(asin, wrapperEl) {
    if (!asin) return;
    const url = '/gp/product/ajax/aodAjaxMain/ref=dp_aod_NEW_mbc' +
      '?asin=' + asin + '&m=&qid=' + getQid() +
      '&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=&pc=dp';

    queuedFetch(url, function (html) {
      if (!document.contains(wrapperEl)) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');

      function sellerQty(offerEl) {
        const opts = offerEl.querySelectorAll('[id^="aod-offer-qty-component-"] .aod-qty-option');
        return opts.length === 0 ? 1 : opts.length;
      }

      let totalQty = 0, sellerCount = 0;
      const pinned = doc.querySelector('#aod-pinned-offer');
      if (pinned) { totalQty += sellerQty(pinned); sellerCount++; }
      doc.querySelectorAll('#aod-offer-list #aod-offer').forEach(function (o) {
        totalQty += sellerQty(o); sellerCount++;
      });

      if (totalQty <= 0) return;
      const display = String(totalQty) + (sellerCount > 9 ? '+' : '');
      const qtyEl = wrapperEl.querySelector('.sb1c-qty-val');
      if (qtyEl) { qtyEl.textContent = display; qtyEl.style.fontStyle = 'normal'; qtyEl.style.color = '#000'; }
    });
  }

  // Helper to dynamically update links inside the card wrapper once the title is resolved
  function updateCardLinks(wrapperEl, title) {
    if (!title) return;
    wrapperEl.querySelectorAll('a.sb1c-link-a').forEach(function (a) {
      const svg = a.querySelector('svg');
      if (!svg) return;
      const classes = svg.className.baseVal || svg.className || '';
      
      let newHref = '#';
      let btnTitle = '';

      if (classes.includes('sb1c-svg-ebay')) {
        newHref = buildEbayUrl(title);
        btnTitle = 'Search on eBay';
      } else if (classes.includes('sb1c-svg-walmart')) {
        newHref = buildWalmartUrl(title);
        btnTitle = 'Search on Walmart';
      } else if (classes.includes('sb1c-svg-amazon')) {
        newHref = CardCore.buildSearchUrl('amazon', title);
        btnTitle = 'Search on Amazon';
      } else if (classes.includes('sb1c-svg-aliexpress')) {
        newHref = buildAliUrl(title);
        btnTitle = 'Search on AliExpress';
      } else if (classes.includes('sb1c-svg-temu')) {
        newHref = buildTemuUrl(title);
        btnTitle = 'Search on Temu';
      } else if (classes.includes('sb1c-svg-alibaba')) {
        newHref = buildAlibabaUrl(title);
        btnTitle = 'Search on Alibaba';
      }

      if (newHref !== '#') {
        a.setAttribute('href', newHref);
        a.setAttribute('title', btnTitle);
      }
    });
  }

  // ─── Product page fetch: UPC + Brand (Grabley-style, search cards only) ───
  // On the detail page itself UPC/brand are read from the DOM synchronously.
  function fetchProductPageData(url, asin, supplier, wrapperEl, data) {
    const fetchUrl = url || (asin ? 'https://www.amazon.com/dp/' + asin : null);
    if (!fetchUrl) return;

    queuedFetch(fetchUrl, function (html) {
        if (!document.contains(wrapperEl)) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');

        let upc = '', brand = '', detailTitle = '';

        if (supplier === 'amazon') {
          upc   = readUpcFromDom(doc);
          brand = readBrandFromDom(doc);
          detailTitle = safeText(doc.querySelector('#productTitle'));
        } else {
          // Walmart UPC
          const gtinEl = doc.querySelector('[itemprop="gtin13"]');
          if (gtinEl) upc = (gtinEl.getAttribute('content') || gtinEl.textContent).trim();
          if (!upc) {
            doc.querySelectorAll('tr, [data-testid="product-spec-row"]').forEach(function (row) {
              if (upc) return;
              const cells = row.querySelectorAll('td, th, span');
              if (cells.length >= 2) {
                const label = cells[0].textContent.trim().toLowerCase();
                if (label === 'upc' || label === 'gtin') upc = cells[1].textContent.trim().split(/\s+/)[0];
              }
            });
          }
          // Walmart brand
          const wmBrand = doc.querySelector('[itemprop="brand"] [itemprop="name"], .prod-brandName');
          if (wmBrand) brand = safeText(wmBrand);
          detailTitle = safeText(doc.querySelector('[itemprop="name"][data-testid], h1.prod-ProductTitle, [data-testid="product-title"], h1'));
        }

        // Update passed data object reference
        if (data) {
          if (upc) data.upc = upc;
          if (brand) data.brand = brand;
          if (detailTitle) {
            data.title = detailTitle;
            // Update the card link href attributes on the fly
            updateCardLinks(wrapperEl, detailTitle);
          }
        }

        // Apply UPC
        const upcEl  = wrapperEl.querySelector('.sb1c-upc-val');
        const upcRow = wrapperEl.querySelector('.sb1c-upc-row');
        if (upcEl) {
          if (upc && /^\d{6,14}$/.test(upc)) {
            upcEl.textContent = upc;
            upcEl.style.fontStyle = 'normal';
            upcEl.style.color = '#000';
            const copyBtn = upcEl.closest('.sb1c-row') && upcEl.closest('.sb1c-row').querySelector('.sb1c-copy-btn');
            if (copyBtn) { copyBtn.dataset.copy = upc; copyBtn.style.opacity = '1'; }
          } else {
            const row = upcRow || upcEl.closest('.sb1c-row');
            if (row) row.style.display = 'none';
          }
        }

        // Apply Brand
        if (brand) {
          const brandVal = wrapperEl.querySelector('.sb1c-brand-val');
          const brandRow = wrapperEl.querySelector('.sb1c-brand-row');
          if (brandVal) {
            brandVal.textContent = brand;
            if (brandRow) brandRow.style.display = '';
          }
        }
    });
  }

  // ─── Per-supplier configs ─────────────────────────────────────────────────
  const SUPPLIERS = {

    amazon: {
      marketplace: 'amazon',
      matchListingPage() {
        const p = location.pathname, q = location.search;
        return (
          /^\/s(\/|$|\?)/.test(p) || /^\/b(\/|$|\?)/.test(p) ||
          /gp\/browse/.test(p) || /\/stores\//.test(p) ||
          /\/Best-Sellers-/.test(p) || q.includes('&k=') || q.includes('?k=')
        );
      },

      matchDetailPage() {
        return (
          /\/dp\/[A-Z0-9]{10}/i.test(location.pathname) ||
          /\/gp\/product\/[A-Z0-9]{10}/i.test(location.pathname) ||
          !!document.querySelector('#productTitle')
        );
      },

      findContainers() {
        const items = document.querySelectorAll(
          '[data-component-type="s-search-result"][data-asin]:not([data-asin=""]),' +
          '[data-component-type="sp-sponsored-result"][data-asin]:not([data-asin=""])'
        );
        if (items.length) return items;
        return document.querySelectorAll(
          '.s-result-list > [data-asin]:not([data-asin=""]),' +
          '.s-search-results > [data-asin]:not([data-asin=""])'
        );
      },

      extract(el) {
        const asin = el.dataset.asin || '';
        const titleEl = (
          el.querySelector('h2 a span') ||
          el.querySelector('span.a-size-medium') ||
          el.querySelector('span.a-size-base-plus') ||
          el.querySelector('[data-cy="title-recipe-title"]')
        );
        const linkEl  = el.querySelector('h2 a[href]') || el.querySelector('a.a-link-normal[href*="/dp/"]');
        let title = safeText(titleEl);
        if (!title && linkEl) {
          title = safeText(linkEl);
        }
        const imgEl   = el.querySelector('img.s-image');
        const rawHref = linkEl ? linkEl.getAttribute('href') : '';
        const url = rawHref.startsWith('http')
          ? rawHref.split('?')[0]
          : (rawHref ? 'https://www.amazon.com' + rawHref.split('?')[0] : 'https://www.amazon.com/dp/' + asin);
        const prime = !!(el.querySelector('.a-icon-prime') || el.querySelector('[aria-label="Amazon Prime"]'));
        return {
          supplier: 'amazon', productId: asin, asin, title,
          image: imgEl ? imgEl.src : '', url,
          // Brand intentionally empty on search cards — filled async from product page fetch
          brand: '', prime, primeOrShipping: prime ? 'Prime' : '', idLabel: 'ASIN', upc: '',
        };
      },

      extractFromDetailPage() {
        const asin = (
          document.querySelector('#ASIN')?.value ||
          document.querySelector('input[name="ASIN"]')?.value ||
          document.querySelector('[data-asin]')?.dataset.asin ||
          (/\/dp\/([A-Z0-9]{10})/i.exec(location.pathname) || [])[1] || ''
        );
        const title  = safeText(document.querySelector('#productTitle'));
        const prime  = !!(
          document.querySelector('#desktop_buybox .a-icon-prime') ||
          document.querySelector('#buybox .a-icon-prime') ||
          document.querySelector('.a-icon-prime')
        );
        const imgEl  = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
        const brand  = readBrandFromDom(document);
        const upc    = readUpcFromDom(document);
        return {
          supplier: 'amazon', productId: asin, asin, title,
          image: imgEl ? imgEl.src : '', url: location.href.split('?')[0],
          brand, prime, primeOrShipping: prime ? 'Prime' : '', idLabel: 'ASIN', upc,
        };
      },

      insertCard(container, wrapper) {
        let el;
        el = container.querySelector('.s-title-instructions-style');
        if (el) { el.appendChild(wrapper); return; }
        el = container.querySelector('h2 > a');
        if (el?.parentElement?.parentElement) { el.parentElement.parentElement.appendChild(wrapper); return; }
        el = container.querySelector('div.a-section.a-spacing-none a.a-link-normal');
        if (el?.parentElement?.parentElement) { el.parentElement.parentElement.appendChild(wrapper); return; }
        el = container.querySelector('div.sg-row:nth-child(2)>div:nth-child(2)');
        if (el?.parentElement) { el.parentElement.insertBefore(wrapper, el); wrapper.style.paddingLeft = '12px'; return; }
        el = container.querySelector('img.s-image');
        if (el?.parentNode?.parentNode?.parentNode) { el.parentNode.parentNode.parentNode.appendChild(wrapper); return; }
        container.appendChild(wrapper);
      },

      insertCardOnDetailPage(wrapper) {
        function insertAfter(anchor) {
          if (!anchor || !anchor.parentNode) return false;
          anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
          return true;
        }
        const titleSection = document.querySelector('#titleSection');
        if (titleSection && insertAfter(titleSection.parentElement || titleSection)) return;
        if (insertAfter(document.querySelector('#productTitle'))) return;
        const fb = document.querySelector('#feature-bullets');
        if (fb?.parentNode) { fb.parentNode.insertBefore(wrapper, fb); return; }
        const cc = document.querySelector('#centerCol');
        if (cc) cc.insertBefore(wrapper, cc.firstChild);
      },
    },

    walmart: {
      marketplace: 'walmart',
      matchListingPage() {
        const p = location.pathname;
        return (
          /^\/search(\/|$|\?)/.test(p) || /^\/browse(\/|$)/.test(p) || /^\/cp\//.test(p) ||
          location.search.includes('?q=') || location.search.includes('&q=')
        );
      },

      matchDetailPage() {
        return (
          /^\/ip\//.test(location.pathname) ||
          !!document.querySelector('[itemprop="name"][data-testid], h1.prod-ProductTitle, [data-testid="product-title"]')
        );
      },

      findContainers() {
        const byItemId = document.querySelectorAll('[data-item-id]');
        if (byItemId.length) return byItemId;
        return document.querySelectorAll('[data-testid="list-view"] > div, [data-testid="search-result-listview-item"]');
      },

      extract(el) {
        const dataId  = el.dataset.itemId || '';
        const linkEl  = el.querySelector('a[href*="/ip/"]');
        const rawHref = linkEl ? linkEl.getAttribute('href') : '';
        const idMatch = /\/ip\/(?:[^/?#]+\/)?(\d{6,12})/.exec(rawHref);
        const productId = dataId || (idMatch ? idMatch[1] : '');
        const titleEl = (
          el.querySelector('[data-automation-id="product-title"]') ||
          el.querySelector('[data-testid="product-title"]') ||
          el.querySelector('a[link-identifier="productName"] span')
        );
        const imgEl = el.querySelector('img[data-testid], .hover-zoom-hero-image img, img[loading="lazy"]');
        const url = rawHref
          ? (rawHref.startsWith('http') ? rawHref.split('?')[0] : 'https://www.walmart.com' + rawHref.split('?')[0])
          : (productId ? 'https://www.walmart.com/ip/' + productId : '');
        const brandEl = el.querySelector('[data-automation-id="product-brand"]');
        let stockQty = '';
        const fulfillEl = (
          el.querySelector('[data-automation-id="fulfillment-badge"]') ||
          el.querySelector('[data-testid="product-availability"]') ||
          el.querySelector('[data-automation-id="product-stock-status"]')
        );
        if (fulfillEl) {
          const t = safeText(fulfillEl);
          const n = t.match(/only\s+(\d+)\s+left/i) || t.match(/(\d+)\s+left/i);
          if (n) stockQty = n[1];
          else if (/out\s+of\s+stock/i.test(t)) stockQty = 'Out';
          else if (/limited/i.test(t)) stockQty = 'Limited';
          else if (t) stockQty = 'In Stock';
        }
        return {
          supplier: 'walmart', productId, title: safeText(titleEl),
          image: imgEl ? imgEl.src : '', url, brand: safeText(brandEl),
          primeOrShipping: '', idLabel: 'Item ID', stockQty, upc: '',
        };
      },

      extractFromDetailPage() {
        const pathMatch = /\/ip\/(?:[^/?#]+\/)?(\d{6,12})/.exec(location.pathname);
        const productId = pathMatch ? pathMatch[1] : '';
        const titleEl   = (
          document.querySelector('h1.prod-ProductTitle') ||
          document.querySelector('[itemprop="name"]') ||
          document.querySelector('[data-testid="product-title"]') ||
          document.querySelector('h1')
        );
        const brandEl = (
          document.querySelector('[itemprop="brand"] [itemprop="name"]') ||
          document.querySelector('[data-automation-id="product-brand"]') ||
          document.querySelector('.prod-brandName')
        );
        const imgEl = (
          document.querySelector('[data-testid="hero-image"] img') ||
          document.querySelector('.prod-hero-image img') ||
          document.querySelector('[data-automation-id="image-section"] img')
        );
        let upc = '';
        const gtinEl = document.querySelector('[itemprop="gtin13"]');
        if (gtinEl) upc = (gtinEl.getAttribute('content') || gtinEl.textContent).trim();
        if (!upc) {
          document.querySelectorAll('[data-testid="product-spec-row"], tr').forEach(function (row) {
            if (upc) return;
            const cells = row.querySelectorAll('td, th, span');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().toLowerCase();
              if (label === 'upc' || label === 'gtin') upc = cells[1].textContent.trim().split(/\s+/)[0];
            }
          });
        }
        let stockQty = '';
        const availEl = document.querySelector('[data-automation-id="fulfillment-badge"], [data-testid="product-availability"]');
        if (availEl) {
          const t = safeText(availEl);
          const n = t.match(/only\s+(\d+)\s+left/i) || t.match(/(\d+)\s+left/i);
          if (n) stockQty = n[1];
          else if (/out\s+of\s+stock/i.test(t)) stockQty = 'Out';
          else if (/limited/i.test(t)) stockQty = 'Limited';
          else if (t) stockQty = 'In Stock';
        }
        return {
          supplier: 'walmart', productId, title: safeText(titleEl),
          image: imgEl ? imgEl.src : '', url: location.href.split('?')[0],
          brand: safeText(brandEl), primeOrShipping: '',
          idLabel: 'Item ID', stockQty, upc,
        };
      },

      insertCard(container, wrapper) {
        const parent = container.parentNode;
        if (container.nextSibling && parent) parent.insertBefore(wrapper, container.nextSibling);
        else if (parent) parent.appendChild(wrapper);
        else container.appendChild(wrapper);
      },

      insertCardOnDetailPage(wrapper) {
        function insertAfter(anchor) {
          if (!anchor || !anchor.parentNode) return false;
          anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
          return true;
        }
        if (insertAfter(document.querySelector('div > section > [itemprop="name"]'))) return;
        if (insertAfter(document.querySelector('h1.prod-ProductTitle') || document.querySelector('h1[itemprop="name"]'))) return;
        const ts = document.querySelector('[data-testid="product-title"], [data-automation-id="product-title"]');
        if (ts) insertAfter(ts.closest('section') || ts);
      },
    },

    ebay: {
      marketplace: 'ebay',

      matchListingPage() {
        const p = location.pathname;
        return (
          p === '/' ||
          p === '/index.html' ||
          /^\/sch\b/i.test(p) ||
          /^\/b\b/i.test(p) ||
          /^\/str\b/i.test(p) ||
          /^\/deals\b/i.test(p)
        );
      },

      matchDetailPage() {
        return CardCore.isEbayItemUrl(location.href);
      },

      findContainers() {
        // eBay 2025+: .s-card  |  legacy: .s-item  |  homepage/deals: .hl-card, .hl-item, carousel
        return document.querySelectorAll('.s-card, .s-item, .hl-card, .hl-item, [data-testid="carousel-card"]');
      },

      extract(el) {
        // eBay 2025+ layout: title link lives in .su-card-container__header > a.s-card__link
        const linkEl =
          el.querySelector('.su-card-container__header a[href*="/itm/"]') ||
          el.querySelector('a.s-item__link') ||
          el.querySelector('a.s-card__link[href*="/itm/"]') ||
          el.querySelector('a[href*="/itm/"]');
        const rawHref = linkEl ? linkEl.getAttribute('href') : '';
        const productId = CardCore.extractEbayItemId(rawHref);

        // Title: 2025+ uses .s-card__title; legacy uses .s-item__title
        const titleEl =
          el.querySelector('.s-card__title') ||
          el.querySelector('.s-item__title') ||
          el.querySelector('.s-item__title span') ||
          el.querySelector('.hl-item__title') ||
          el.querySelector('.hl-card__title') ||
          el.querySelector('h3') ||
          linkEl;
        const title = safeText(titleEl);

        const imgEl = el.querySelector('img.s-card__image, .s-item__image-img img, img.s-item__image, .s-item__image-wrapper img, img');

        // Price: 2025+ uses .s-card__price; legacy uses .s-item__price
        const priceEl =
          el.querySelector('.s-card__price') ||
          el.querySelector('.s-item__price') ||
          el.querySelector('.hl-item__price') ||
          el.querySelector('.hl-card__price');
        const price = safeText(priceEl);

        const sellerEl = el.querySelector('.s-item__seller-info') || el.querySelector('.s-item__username');
        const seller = safeText(sellerEl);

        return {
          supplier: 'ebay',
          productId,
          idLabel: 'Item ID',
          title,
          searchQuery: CardCore.cleanSearchQuery(title),
          image: imgEl ? imgEl.src : '',
          url: rawHref ? rawHref.split('?')[0] : '',
          price,
          seller,
          brand: '',
          condition: '',
        };
      },

      extractFromDetailPage() {
        const data = CardCore.extractEbayProduct(document, location.href);
        data._isDetailPage = true;
        return data;
      },

      insertCard(container, wrapper) {
        // .s-card (2025+): insert before the attributes/price row inside the grid.
        // This places the card between the title+condition header and the price.
        if (container.classList && container.classList.contains('s-card')) {
          const attrs = container.querySelector('.su-card-container__attributes');
          if (attrs && attrs.parentNode) {
            attrs.parentNode.insertBefore(wrapper, attrs);
            return;
          }
        }
        // Legacy .s-item: insert before the price element (between condition and price).
        if (container.classList && container.classList.contains('s-item')) {
          const price = container.querySelector('.s-item__price');
          if (price && price.parentNode) {
            price.parentNode.insertBefore(wrapper, price);
            return;
          }
        }
        // Homepage / deals carousels (.hl-card, .hl-item)
        const hlTitle = container.querySelector('.hl-item__title, .hl-card__title');
        if (hlTitle && hlTitle.parentNode) {
          hlTitle.parentNode.insertBefore(wrapper, hlTitle.nextSibling);
          return;
        }
        container.appendChild(wrapper);
      },

      insertCardOnDetailPage(wrapper) {
        function insertAfter(anchor) {
          if (!anchor || !anchor.parentNode) return false;
          anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
          return true;
        }

        const titleRegion =
          document.querySelector('.vim.x-item-title') ||
          document.querySelector('[data-testid="x-item-title"]') ||
          document.querySelector('.x-item-title') ||
          document.querySelector('h1.x-item-title__mainTitle')?.parentElement;
        if (insertAfter(titleRegion)) return;

        const title =
          document.querySelector('h1.x-item-title__mainTitle') ||
          document.querySelector('h1[itemprop="name"]') ||
          document.querySelector('h1#itemTitle');
        if (insertAfter(title)) return;

        const buyBox =
          document.querySelector('[data-testid="x-buybox"]') ||
          document.querySelector('.x-buybox') ||
          document.querySelector('.vim.x-buybox');
        if (buyBox?.parentNode) buyBox.parentNode.insertBefore(wrapper, buyBox);
      },
    },
  };

  // ─── Card HTML builder ────────────────────────────────────────────────────
  function buildCardHTML(data) {
    const key   = data.supplier;
    const title = data.searchQuery || data.title || '';

    // Search-by link buttons — <a href target="_blank"> so the browser opens
    // a new tab natively. stopPropagation is added in wireCard so Amazon's
    // container handler never fires.
    function linkBtn(href, svgMarkup, btnTitle) {
      return '<a href="' + escHtml(href) + '" target="_blank" rel="noopener noreferrer"' +
        ' class="sb1c-link-a" title="' + escHtml(btnTitle) + '" aria-label="' + escHtml(btnTitle) + '">' +
        '<span aria-hidden="true">' + svgMarkup + '</span></a>';
    }

    const targetLabels = {
      ebay: 'eBay',
      amazon: 'Amazon',
      walmart: 'Walmart',
      aliexpress: 'AliExpress',
      temu: 'Temu',
      alibaba: 'Alibaba',
    };
    const targets = key === 'ebay'
      ? CardCore.SEARCH_TARGETS
      : CardCore.SEARCH_TARGETS.filter(target => target !== key);
    const searchButtons = targets.map(target => {
      const href = title ? CardCore.buildSearchUrl(target, title) : '#';
      return linkBtn(href, SVG[target], 'Search on ' + targetLabels[target]);
    }).join('');

    function copyBtn(val) {
      return '<button type="button" class="sb1c-copy-btn" data-copy="' + escHtml(val) + '"' +
        ' style="opacity:' + (val ? '1' : '0.3') + ';" title="Copy" aria-label="Copy value">' +
        SVG.copy + '</button>';
    }

    function valueRow(label, value, className) {
      if (!value) return '';
      return '<div class="sb1c-row ' + (className || '') + '">' +
        '<b>' + escHtml(label) + ':</b>' +
        '<span class="sb1c-val-group"><span class="sb1c-value-text">' + escHtml(value) + '</span></span>' +
      '</div>';
    }

    const idRow = data.productId
      ? '<div class="sb1c-row">' +
          '<b>' + data.idLabel + ':</b>' +
          '<span class="sb1c-val-group">' +
            '<span class="sb1c-value-text">' + escHtml(data.productId) + '</span>' +
            copyBtn(data.productId) +
          '</span>' +
        '</div>'
      : '';

    // UPC: shown immediately if known (detail page), else shows loading...
    let upcRow;
    if (data.upc && /^\d{6,14}$/.test(data.upc)) {
      upcRow = '<div class="sb1c-row sb1c-upc-row">' +
        '<b>UPC:</b>' +
        '<span class="sb1c-val-group">' +
          '<span class="sb1c-value-text sb1c-upc-val">' + escHtml(data.upc) + '</span>' +
          copyBtn(data.upc) +
        '</span>' +
      '</div>';
    } else {
      upcRow = '<div class="sb1c-row sb1c-upc-row">' +
        '<b>UPC:</b>' +
        '<span class="sb1c-val-group">' +
          '<span class="sb1c-value-text sb1c-upc-val" style="font-style:italic;color:#888;">loading…</span>' +
          copyBtn('') +
        '</span>' +
      '</div>';
    }

    // QTY: Amazon search shows '#' placeholder (AOD fills it); others show DOM value
    let qtyDisplay, qtyStyle;
    if (key === 'amazon' && !data.stockQty) {
      qtyDisplay = '#'; qtyStyle = 'font-style:italic;color:#888;';
    } else {
      const v = data.stockQty || '–';
      qtyDisplay = v;
      qtyStyle = /out/i.test(v) ? 'color:#d00;' : /stock|limited/i.test(v) ? 'color:#007600;' : '';
    }
    const qtyRow = '<div class="sb1c-row">' +
      '<b>Qty:</b>' +
      '<span class="sb1c-val-group">' +
        '<span class="sb1c-value-text sb1c-qty-val" style="' + qtyStyle + '">' + escHtml(qtyDisplay) + '</span>' +
      '</span>' +
    '</div>';

    const primeRow = data.primeOrShipping
      ? '<div class="sb1c-row">' +
          '<b>Prime:</b>' +
          '<span class="sb1c-val-group">' +
            '<span class="sb1c-value-text" style="color:#00558c;font-weight:600;">✓</span>' +
          '</span>' +
        '</div>'
      : '';

    // Brand: hidden initially on search pages (filled async); shown immediately on detail pages
    const brandRow = data.brand
      ? '<div class="sb1c-row sb1c-brand-row"><b>Brand:</b><span class="sb1c-val-group"><span class="sb1c-value-text sb1c-brand-val">' + escHtml(data.brand) + '</span></span></div>'
      : '<div class="sb1c-row sb1c-brand-row" style="display:none;"><b>Brand:</b><span class="sb1c-val-group"><span class="sb1c-value-text sb1c-brand-val"></span></span></div>';

    const uploadBtn = '<button type="button" class="sb1c-action-btn sb1c-upload" title="List on eBay">List Now</button>';
    const plusBtn   = '<button type="button" class="sb1c-action-btn sb1c-plus" title="Add to Bulk">+ Bulk</button>';

    const ebayDetails = key === 'ebay' && data._isDetailPage
      ? idRow +
        valueRow('Price', data.price) +
        valueRow('Condition', data.condition) +
        valueRow('Seller', data.seller) +
        valueRow('Brand', data.brand)
      : '';
    const standardDetails = key === 'ebay'
      ? ''
      : idRow + upcRow + qtyRow + primeRow + brandRow;
    const details = ebayDetails || standardDetails;
    const actions = key === 'ebay'
      ? ''
      : '<div class="sb1c-btn-row">' + uploadBtn + plusBtn + '</div>';

    return (
      '<div class="sb1c-card">' +
        '<div class="sb1c-search-bar" role="group" aria-label="Search this product on other marketplaces">' +
          searchButtons +
        '</div>' +
        (details ? '<div class="sb1c-details">' + details + '</div>' : '') +
        actions +
        '<div class="sb1c-status" role="status" aria-live="polite" style="display:none;"></div>' +
        '<div class="sb1c-footer" style="display:none;"></div>' +
      '</div>'
    );
  }

  // ─── Card state helpers ───────────────────────────────────────────────────
  function setStatus(wrapperEl, state, msg) {
    const status = wrapperEl.querySelector('.sb1c-status');
    if (!status) return;
    if (!state && !msg) { status.style.display = 'none'; status.innerHTML = ''; return; }
    let icon = '';
    if (state === 'loading') {
      icon = SVG.spinner;
    } else if (state === 'success') {
      icon = SVG.ok;
    } else if (state === 'error') {
      icon = SVG.error;
    }
    status.className = 'sb1c-status sb1c-' + (state || 'info');
    status.innerHTML = icon + escHtml(msg || '');
    status.style.display = 'flex'; status.style.alignItems = 'center';
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function handleUpload(wrapperEl, data) {
    const supplierKey = getSupplierKey();
    const config = supplierKey ? SUPPLIERS[supplierKey] : null;
    const isDetail = config && config.matchDetailPage && config.matchDetailPage();

    if (isDetail) {
      setStatus(wrapperEl, 'loading', 'Opening Sidebar…');
      try {
        chrome.storage.local.set({ autoScanOnly: true });
        chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'DOM_READY_AUTO_SCAN' });
        }, 100);
        setStatus(wrapperEl, 'success', 'Sidebar opened ✓');
      } catch (e) {
        setStatus(wrapperEl, 'error', e?.message || 'Failed to open sidebar');
      }
      setTimeout(() => setStatus(wrapperEl, '', ''), 3500);
    } else {
      setStatus(wrapperEl, 'loading', 'Navigating…');
      try {
        await new Promise(r => chrome.storage.local.set({ autoScanActive: true }, r));
        let targetUrl = data.url || '';
        if (targetUrl) {
          targetUrl = targetUrl.includes('#') 
            ? targetUrl.split('#')[0] + '#sellersuit_auto_list=true' 
            : targetUrl + '#sellersuit_auto_list=true';
        }
        await chrome.runtime.sendMessage({ action: 'AUTO_LIST_NEW_TAB', url: targetUrl });
        setStatus(wrapperEl, 'success', 'Opening product page ✓');
      } catch (e) {
        setStatus(wrapperEl, 'error', e?.message || 'Navigation failed');
      }
      setTimeout(() => setStatus(wrapperEl, '', ''), 3500);
    }
  }

  async function handleAddToBulk(wrapperEl, data) {
    setStatus(wrapperEl, 'loading', 'Adding…');
    const key = data.supplier + ':' + (data.productId || data.url);
    try {
      const stored = await new Promise(r => chrome.storage.local.get(['sb1BulkQueue'], r));
      const queue  = Array.isArray(stored.sb1BulkQueue) ? stored.sb1BulkQueue : [];
      if (queue.some(item => item._key === key)) {
        setStatus(wrapperEl, 'success', 'Already queued');
        setTimeout(() => setStatus(wrapperEl, '', ''), 2000); return;
      }
      queue.push({
        _key: key, id: key, url: data.url, title: data.title || '',
        image: data.image || '', supplier: data.supplier,
        sourceId: data.productId || '', upc: data.upc || '', addedAt: Date.now(),
      });
      await new Promise(r => chrome.storage.local.set({ sb1BulkQueue: queue }, r));
      setStatus(wrapperEl, 'success', 'Added ✓ (' + queue.length + ' queued)');
    } catch (e) { setStatus(wrapperEl, 'error', 'Failed to add'); }
    setTimeout(() => setStatus(wrapperEl, '', ''), 2500);
  }

  // ─── Wire up events ───────────────────────────────────────────────────────
  function wireCard(wrapper, data) {
    // Intercept mousedown and mouseup in capture phase to block Amazon's grid navigation hijack
    wrapper.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    }, true);

    wrapper.addEventListener('mouseup', function (e) {
      e.stopPropagation();
    }, true);

    // Intercept click in capture phase to handle actions and block page-level click listeners
    wrapper.addEventListener('click', function (e) {
      e.stopPropagation();

      // 1. List Now (Upload) Button
      const uploadBtn = e.target.closest('.sb1c-upload');
      if (uploadBtn) {
        e.preventDefault();
        handleUpload(wrapper, data);
        return;
      }

      // 2. Add to Bulk Button
      const plusBtn = e.target.closest('.sb1c-plus');
      if (plusBtn) {
        e.preventDefault();
        handleAddToBulk(wrapper, data);
        return;
      }

      // 3. Copy Buttons
      const copyBtnEl = e.target.closest('.sb1c-copy-btn');
      if (copyBtnEl) {
        e.preventDefault();
        const text = copyBtnEl.dataset.copy || '';
        if (text) {
          navigator.clipboard.writeText(text).catch(() => {});
          const origHTML = copyBtnEl.innerHTML;
          copyBtnEl.innerHTML = SVG.ok;
          setTimeout(() => { copyBtnEl.innerHTML = origHTML; }, 1500);
        }
        return;
      }

      // 4. Supplier Search Links
      const link = e.target.closest('a.sb1c-link-a');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && href !== '#' && CardCore.isAllowedSearchUrl(href)) {
          const opened = window.open(href, '_blank', 'noopener,noreferrer');
          if (opened) opened.opener = null;
        }
        return;
      }
    }, true);
  }

  // ─── Injection ────────────────────────────────────────────────────────────
  const MARKER        = 'data-sb1-card';
  const DETAIL_MARKER = 'data-sb1-detail-card';
  const DETAIL_INSTANCE = 'data-sb1-detail-card-instance';

  function injectListingCardCSS() {
    // eBay receives this stylesheet directly from the manifest. Avoid adding a
    // web-accessible <link> on regional domains where it is not needed.
    if (getSupplierKey() === 'ebay') return;
    if (!document.getElementById('sellersuit-listing-card-css')) {
      const cssLink = document.createElement('link');
      cssLink.id = 'sellersuit-listing-card-css';
      cssLink.rel = 'stylesheet';
      cssLink.href = chrome.runtime.getURL('ui/listing-card.css');
      document.head.appendChild(cssLink);
    }
  }

  function injectCard(container, config) {
    if (container.hasAttribute(MARKER)) return;
    container.setAttribute(MARKER, '1');
    const data = config.extract(container);
    if (!data.title && !data.productId) return;

    injectListingCardCSS();

    const wrapper = document.createElement('div');
    wrapper.className = 'sb1c-wrapper sb1c-listing';
    wrapper.innerHTML = buildCardHTML(data);
    wireCard(wrapper, data);
    _injecting = true;
    try { config.insertCard(container, wrapper); } finally { _injecting = false; }

    if (data.supplier === 'amazon') fetchAmazonQty(data.asin, wrapper);
    // Fetch product page for UPC + Brand (not needed on detail page — read from DOM there)
    fetchProductPageData(data.url, data.asin, data.supplier, wrapper, data);
  }

  function scanPage(config) {
    const containers = config.findContainers();
    if (!containers || !containers.length) return;
    Array.from(containers).forEach(c => injectCard(c, config));
  }

  function injectDetailCard(config) {
    const existing = document.querySelector('.sb1c-wrapper[' + DETAIL_INSTANCE + '="1"]');
    if (document.body.hasAttribute(DETAIL_MARKER) && existing) return;
    if (!existing) document.body.removeAttribute(DETAIL_MARKER);
    document.body.setAttribute(DETAIL_MARKER, '1');
    const data = config.extractFromDetailPage();
    if (!data.title && !data.productId) return;

    injectListingCardCSS();

    const wrapper = document.createElement('div');
    wrapper.className = 'sb1c-wrapper';
    wrapper.setAttribute(DETAIL_INSTANCE, '1');
    wrapper.dataset.sb1Fingerprint = CardCore.productFingerprint(data);
    wrapper.innerHTML = buildCardHTML(data);
    wireCard(wrapper, data);
    config.insertCardOnDetailPage(wrapper);

    if (data.supplier === 'amazon') fetchAmazonQty(data.asin, wrapper);
    // If UPC wasn't in DOM (rare), fetch it
    if (!data.upc && data.supplier === 'amazon') fetchProductPageData(data.url, data.asin, data.supplier, wrapper, data);
  }

  function refreshEbayDetailCard(config) {
    const existing = document.querySelector('.sb1c-wrapper[' + DETAIL_INSTANCE + '="1"]');
    if (!existing) {
      document.body.removeAttribute(DETAIL_MARKER);
      injectDetailCard(config);
      return;
    }

    const data = config.extractFromDetailPage();
    if (!data.title && !data.productId) return;
    const fingerprint = CardCore.productFingerprint(data);
    if (existing.dataset.sb1Fingerprint === fingerprint) return;

    const replacement = document.createElement('div');
    replacement.className = 'sb1c-wrapper';
    replacement.setAttribute(DETAIL_INSTANCE, '1');
    replacement.dataset.sb1Fingerprint = fingerprint;
    replacement.innerHTML = buildCardHTML(data);
    wireCard(replacement, data);
    existing.replaceWith(replacement);
  }

  let _injecting = false;
  let _observer = null;
  let _resultsRoot = null;
  const FETCH_CONCURRENCY = 3;
  let _fetchActive = 0;
  const _fetchQueue = [];
  let _fetchAbortCtrl = new AbortController();
  let lastUrl = '';

  function checkUrlAndInject(config) {
    const url = location.pathname + location.search;
    
    // If URL changed, reset markers to support SPA transitions
    if (url !== lastUrl) {
      lastUrl = url;
      // Cancel all in-flight fetches from the previous page
      _fetchAbortCtrl.abort();
      _fetchAbortCtrl = new AbortController();
      _fetchQueue.length = 0;
      _fetchActive = 0;
      // Disconnect observer while removing cards to prevent cascading mutations
      if (_observer) _observer.disconnect();
      document.body.removeAttribute(DETAIL_MARKER);
      document.querySelectorAll('[' + MARKER + ']').forEach(el => el.removeAttribute(MARKER));
      document.querySelectorAll('.sb1c-wrapper').forEach(el => el.remove());
      if (_observer && _resultsRoot) _observer.observe(_resultsRoot, { childList: true, subtree: true });
    }

    if (config.matchListingPage()) {
      scanPage(config);
    } else if (config.matchDetailPage && config.extractFromDetailPage && config.insertCardOnDetailPage) {
      if (config.matchDetailPage()) {
        if (config.marketplace === 'ebay' && document.body.hasAttribute(DETAIL_MARKER)) {
          refreshEbayDetailCard(config);
        } else {
          injectDetailCard(config);
        }
      }
    }
  }

  // ─── Entry point ──────────────────────────────────────────────────────────
  function init() {
    const supplierKey = getSupplierKey();
    if (!supplierKey) return;
    const config = SUPPLIERS[supplierKey];
    if (!config) return;

    // Initial check
    setTimeout(() => checkUrlAndInject(config), 800);

    // Watch DOM mutations to handle SPA dynamic page content changes.
    // Observe a targeted container (not full body) and ignore our own injections.
    const debouncedCheck = debounce(() => checkUrlAndInject(config), 400);
    _observer = new MutationObserver(function (mutations) {
      if (_injecting) return;
      for (const m of mutations) {
        if (m.addedNodes.length) { debouncedCheck(); return; }
      }
    });
    _resultsRoot = document.querySelector(
      'ul.srp-results, div.s-main-slot, [data-testid="list-view-container"], #srp-river-results'
    ) || document.body;
    _observer.observe(_resultsRoot, { childList: true, subtree: true });

    window.addEventListener('popstate', debouncedCheck);
    window.addEventListener('hashchange', debouncedCheck);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
