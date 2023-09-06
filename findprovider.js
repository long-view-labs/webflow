$(document).ready(function () {
  showLabelTotals();
  setTimeout(function () {
    $(".w-condition-invisible").remove();
    updatePageArrows();
    updateTotalCount();
    scrollAnchor();
    postnomReorder();
    showMoreTags();
    $(".filter-list_input-group-parent").on("click", function () {
      // Find the child .w-checkbox-input element
      var checkboxInput = $(this).find(".w-checkbox-input");
      checkboxInput.toggleClass("w--redirected-checked");
    });
  }, 2000);
});

$("input[filter-button]").click(function () {
  var value = $(this).attr("filter-button");
  $("#" + value).trigger("w-close");
});

// Set event listener for all dropdown boxes
const filter = document.querySelectorAll(".filter-list_input-group");
filter.forEach(function (dropdown) {
  dropdown.addEventListener("click", function () {
    setTimeout(function () {
      updateTotalCount();
      showInsuranceWrapper();
      showHideCommas();
      showMoreTags();
      postnomReorder();
      updateSpecialty();
    }, 500);
  });
});

// Set event listener for search input
var providerSearchInput = document.querySelector(".provider-filter_search");
providerSearchInput.addEventListener("input", function (event) {
  setTimeout(function () {
    updateTotalCount();
    showInsuranceWrapper();
    showHideCommas();
    showMoreTags();
    postnomReorder();
    updateSpecialty();
  }, 500);
});

// Set event listener for specialty
const specialtyField = document.querySelectorAll(
  ".filter-list_input-group.specialty"
);
specialtyField.forEach(function (field) {
  field.addEventListener("click", function () {
    setTimeout(function () {
      updateSpecialty();
    }, 500);
  });
});

// Set event listener for style
const styleField = document.querySelectorAll(".filter-list_input-group.style");
styleField.forEach(function (field) {
  field.addEventListener("click", function () {
    setTimeout(function () {
      updateStyle();
    }, 500);
  });
});

// On pageination click
$(".pagination").click(function () {
  setTimeout(function () {
    updatePageArrows();
    showMoreTags();
    scrollAnchor();
    postnomReorder();
  }, 200);
});

function postnomReorder() {
  $(".postnominals-list").each(function () {
    // Reorder postnominal labels
    var wrapper = $(this);
    var items = wrapper.find(".w-dyn-item");

    items.sort(function (a, b) {
      var textA = $(a).find("div.postnominal-templ").text().trim();
      var textB = $(b).find("div.postnominal-templ").text().trim();
      // Priority 1: 'MS', 'MA', 'MPH', 'MEd'
      var priority1 = ["MS", "MA", "MPH", "MEd", "MDA"];
      if (priority1.includes(textA)) {
        return -1;
      } else if (priority1.includes(textB)) {
        return 1;
      }

      // Priority 2: 'RD'
      var priority2 = ["RD"];
      if (priority2.includes(textA)) {
        return -1;
      } else if (priority2.includes(textB)) {
        return 1;
      }

      // Priority 3: 'RDN'
      var priority3 = ["RDN"];
      if (priority3.includes(textA)) {
        return -1;
      } else if (priority3.includes(textB)) {
        return 1;
      }

      // Priority 4: 'LD'
      var priority4 = ["LD"];
      if (priority4.includes(textA)) {
        return -1;
      } else if (priority4.includes(textB)) {
        return 1;
      }

      // Priority 5: 'LDN'
      var priority5 = ["LDN"];
      if (priority5.includes(textA)) {
        return -1;
      } else if (priority5.includes(textB)) {
        return 1;
      }

      // Priority 6: Sort all other titles alphabetically
      return textA.localeCompare(textB);
    });

    // Reorder the elements
    wrapper.append(items);
  });
}

function scrollAnchor() {
  $(".page-number").click(function () {
    $("html, body").animate(
      {
        scrollTop: $("#top-filter").offset().top,
      },
      1000
    );
  });
}

// Update total number of shown items to closest 50
function updateTotalCount() {
  var $element = $('[fs-cmsfilter-element="results-count"]');
  var count = parseInt($element.text());
  if (count > 49) {
    var replacement = Math.floor(count / 50) * 50;
    $element.text(replacement + "+");
  }
}

// Show insurance content wrapper if insurance item is selected
function showInsuranceWrapper() {
  var dropdownList = document.getElementById("w-dropdown-list-3");
  var activeElement = dropdownList.querySelector(".fs-cmsfilter_active");
  if (activeElement) {
    // hideInsurance();
  } else {
    showInsurance();
  }
}

// Hide commas if last visibile insurance item
function showHideCommas() {
  $('[fs-cmsnest-collection="insurances"]').each(function () {
    const visibleItems = $(this).find(
      ".provider-list_insurance-item:not(:hidden)"
    );
    visibleItems.not(":last").removeClass("select");
    visibleItems.last().addClass("select");
  });
}

// Update styles of specialty category card
function updateSpecialty() {
  var dropdownList = document.getElementById("w-dropdown-list-2");
  // See if active element exists in dropdown
  var activeElement = dropdownList.querySelector(".fs-cmsfilter_active");
  var providerSearchInputValue = document
    .querySelector(".provider-filter_search")
    .value.toLowerCase();

  var elements = document.getElementsByClassName("provider-list_specialty");

  if (activeElement || providerSearchInputValue) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.opacity = ".5";
    }
  } else {
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.opacity = "1";
    }
  }
}

// Update styles of style category card
function updateStyle() {
  var dropdownList = document.getElementById("w-dropdown-list-5");
  var activeElement = dropdownList.querySelector(".fs-cmsfilter_active");
  var elements = document.getElementsByClassName("provider-list_style");

  if (activeElement) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.opacity = "0.5";
    }
  } else {
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.opacity = "1";
    }
  }
}

// Update insurance list
function hideInsurance() {
  var elements = document.getElementsByClassName(
    "provider-list_insurance-item"
  );
  for (var i = 0; i < elements.length; i++) {
    elements[i].style.display = "none";
  }
}

// Update insurance list
function showInsurance() {
  var elements = document.getElementsByClassName(
    "provider-list_insurance-item"
  );
  for (var i = 0; i < elements.length; i++) {
    elements[i].style.display = "block";
  }
}

// Update pagination arrow states
function updatePageArrows() {
  var lastElement = $(".page-num-wrap").find(".page-number:last");
  var firstElement = $(".page-num-wrap").find(".page-number:first");
  if (lastElement.hasClass("w--current")) {
    $(".next").removeClass("active");
    $(".previous").addClass("active");
  } else if (firstElement.hasClass("w--current")) {
    $(".previous").removeClass("active");
    $(".next").addClass("active");
  } else if (lastElement == firstElement) {
    $(".previous").removeClass("active");
    $(".next").removeClass("active");
  } else {
    $(".next").addClass("active");
    $(".previous").addClass("active");
  }
}

function showMoreTags() {
  if ($(window).width() > 768) {
    $(".provider-list_card").each(function () {
      // Delete any existing elements with class 'show-more'
      $(this).find(".show-more").remove();
      var specialtyDiv = $(this).find('[fs-cmsnest-collection="specialty"]');
      var specialtyChildren = specialtyDiv.children();

      if (specialtyChildren.length > 8) {
        specialtyChildren.slice(8).hide();

        var hiddenCount = specialtyChildren.length - 8;
        var showMoreText = $(
          '<span class="provider-list_specialty show-more">+ ' +
            hiddenCount +
            " more specialties</span>"
        );

        showMoreText.on("click", function () {
          specialtyChildren.slice(8).show();
          $(this).hide();
        });

        specialtyDiv.append(showMoreText);
      }
    });
  } else if ($(window).width() < 768) {
    $(".provider-list_card").each(function () {
      $(this).find(".show-more").remove();

      var specialtyDiv = $(this).find('[fs-cmsnest-collection="specialty"]');
      var specialtyChildren = specialtyDiv.children();

      if (specialtyChildren.length > 4) {
        specialtyChildren.slice(4).hide();

        var hiddenCount = specialtyChildren.length - 4;
        var showMoreText = $(
          '<span class="provider-list_specialty show-more">+ ' +
            hiddenCount +
            " more specialties</span>"
        );

        showMoreText.on("click", function () {
          specialtyChildren.slice(4).show();
          $(this).hide();
        });

        specialtyDiv.append(showMoreText);
      }
    });
  }
}

function showLabelTotals() {
  $(".provider-filter_dopdown-list").on("click", function () {
    var $this = $(this);
    var $activeElements = $this.find(".fs-cmsfilter_active");
    setTimeout(function () {
      var count = $this.find(".fs-cmsfilter_active").length;
      var text = "(" + count + ")";
      var $labelTotal = $this.find(".drop-label-total");
      $labelTotal.text(text);
      $labelTotal.toggle(count > 0);
      $this
        .siblings(".provider-filter_dopdown-toggle")
        .find(".drop-label-total")
        .text(text);
      $this
        .siblings(".provider-filter_dopdown-toggle")
        .find(".drop-label-total")
        .toggle(count > 0);
    }, 0);
  });
}
