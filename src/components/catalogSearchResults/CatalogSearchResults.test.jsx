import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';

import { SearchContext } from '@edx/frontend-enterprise-catalog-search';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import {
  BaseCatalogSearchResults, NO_DATA_MESSAGE, ERROR_MESSAGE, SKELETON_DATA_TESTID,
} from './CatalogSearchResults';
import { renderWithRouter } from '../tests/testUtils';
import messages from './CatalogSearchResults.messages';
import { HIDE_PRICE_REFINEMENT } from '../../constants';

// Mocking this connected component so as not to have to mock the algolia Api
const PAGINATE_ME = 'PAGINATE ME :)';
const PaginationComponent = () => <div>{PAGINATE_ME}</div>;

const DEFAULT_SEARCH_CONTEXT_VALUE = { refinements: {} };

// eslint-disable-next-line react/prop-types
const SearchDataWrapper = ({ children, searchContextValue = DEFAULT_SEARCH_CONTEXT_VALUE }) => (
  <SearchContext.Provider value={searchContextValue}>
    {children}
  </SearchContext.Provider>
);

const mockConfig = () => (
  {
    EDX_FOR_BUSINESS_TITLE: 'ayylmao',
    EDX_FOR_ONLINE_EDU_TITLE: 'foo',
    EDX_ENTERPRISE_ALACARTE_TITLE: 'baz',
    FEATURE_CARD_VIEW_ENABLED: 'True',
  }
);

jest.mock('@edx/frontend-platform', () => ({
  ...jest.requireActual('@edx/frontend-platform'),
  getConfig: () => mockConfig(),
}));

const TEST_COURSE_NAME = 'test course';
const TEST_PARTNER = 'edx';
const TEST_CATALOGS = ['baz'];

const TEST_COURSE_NAME_2 = 'test course 2';
const TEST_PARTNER_2 = 'edx 2';
const TEST_CATALOGS_2 = ['baz', 'ayylmao'];

const searchResults = {
  nbHits: 1,
  hitsPerPage: 10,
  pageIndex: 10,
  pageCount: 5,
  nbPages: 6,
  hits: [
    {
      title: TEST_COURSE_NAME,
      partners: [{ name: TEST_PARTNER, logo_image_url: '' }],
      enterprise_catalog_query_titles: TEST_CATALOGS,
      card_image_url: 'http://url.test.location',
      first_enrollable_paid_seat_price: 100,
      original_image_url: '',
      availability: ['Available Now'],
    },
    {
      title: TEST_COURSE_NAME_2,
      partners: [{ name: TEST_PARTNER_2, logo_image_url: '' }],
      enterprise_catalog_query_titles: TEST_CATALOGS_2,
      card_image_url: 'http://url.test2.location',
      first_enrollable_paid_seat_price: 99,
      original_image_url: '',
      availability: ['Available Now'],
    },
  ],
  page: 1,
  _state: { disjunctiveFacetsRefinements: { foo: 'bar' } },
};

const defaultProps = {
  paginationComponent: PaginationComponent,
  searchResults,
  isSearchStalled: false,
  searchState: { page: 1 },
  error: null,
  // mock i18n requirements
  intl: {
    formatMessage: (header) => header.defaultMessage,
    formatDate: () => {},
    formatTime: () => {},
    formatRelative: () => {},
    formatNumber: () => {},
    formatPlural: () => {},
    formatHTMLMessage: () => {},
    now: () => {},
  },
};

describe('Main Catalogs view works as expected', () => {
  test('all courses rendered when search results available', () => {
    render(
      <SearchDataWrapper>
        <IntlProvider locale="en">
          <BaseCatalogSearchResults {...defaultProps} />
        </IntlProvider>,
      </SearchDataWrapper>,
    );

    // switch to table view instead of card
    const listViewToggleButton = screen.getByLabelText('List view');
    userEvent.click(listViewToggleButton);

    // course 1
    expect(screen.queryByText(TEST_COURSE_NAME)).toBeInTheDocument();
    expect(screen.queryByText(TEST_PARTNER)).toBeInTheDocument();

    // course 2
    expect(screen.queryByText(TEST_COURSE_NAME_2)).toBeInTheDocument();
    expect(screen.queryByText(TEST_PARTNER_2)).toBeInTheDocument();
  });
  test('all courses rendered in card view when search results available', () => {
    render(
      <SearchDataWrapper>
        <IntlProvider locale="en">
          <BaseCatalogSearchResults {...defaultProps} />
        </IntlProvider>,
      </SearchDataWrapper>,
    );

    // view selection toggle buttons
    expect(screen.getByLabelText('Card view')).toBeVisible();
    expect(screen.getByLabelText('List view')).toBeVisible();

    // since card view feature is on, card view should be the default!
    const table = screen.queryByRole('table');
    expect(table).not.toBeInTheDocument();

    // expect at least one of the course cards is rendered correctly
    const courseTitleInCard = screen.queryByText(TEST_COURSE_NAME);
    expect(courseTitleInCard).toBeVisible();

    // course 1 image with the correct alt text
    expect(screen.getByAltText(TEST_COURSE_NAME)).toBeVisible();
  });
  test('pagination component renders', () => {
    renderWithRouter(
      <SearchDataWrapper>
        <BaseCatalogSearchResults
          {...defaultProps}
        />
      </SearchDataWrapper>,
    );
    expect(screen.queryByText(PAGINATE_ME)).toBeInTheDocument();
  });
  test('no search results displays NO_DATA_MESSAGE', () => {
    const emptySearchResults = { ...searchResults, nbHits: 0 };
    renderWithRouter(
      <SearchDataWrapper>
        <BaseCatalogSearchResults
          {...defaultProps}
          searchResults={emptySearchResults}
        />
      </SearchDataWrapper>,
    );
    expect(screen.queryByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
  test('error if present is rendered instead of table', () => {
    const ERRMSG = 'something ain\'t right here';
    renderWithRouter(
      <SearchDataWrapper>
        <BaseCatalogSearchResults
          {...defaultProps}
          error={{ message: ERRMSG }}
        />
      </SearchDataWrapper>,
    );

    expect(screen.queryByRole('alert')).toBeInTheDocument();
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeVisible();
    expect(alertElement).toHaveTextContent(`${ERROR_MESSAGE}: ${ERRMSG}`);

    expect(screen.queryByText(TEST_COURSE_NAME)).not.toBeInTheDocument();
    expect(screen.queryByText(TEST_COURSE_NAME_2)).not.toBeInTheDocument();
  });
  test('isSearchStalled leads to rendering skeleton and not content', () => {
    renderWithRouter(
      <SearchDataWrapper>
        <BaseCatalogSearchResults
          {...defaultProps}
          isSearchStalled
        />
      </SearchDataWrapper>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(TEST_COURSE_NAME)).not.toBeInTheDocument();
    expect(screen.getByTestId(SKELETON_DATA_TESTID)).toBeInTheDocument();
  });
  test('headers rendered correctly', () => {
    renderWithRouter(
      <SearchDataWrapper>
        <BaseCatalogSearchResults
          {...defaultProps}
        />
      </SearchDataWrapper>,
    );

    // switch to table view instead of card
    const listViewToggleButton = screen.getByLabelText('List view');
    userEvent.click(listViewToggleButton);

    expect(screen.queryByText(messages['catalogSearchResults.table.courseName'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.catalogs'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.partner'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.price'].defaultMessage)).toBeInTheDocument();
  });
  test('refinements hide price column and show availability', () => {
    const refinements = {
      refinements: { [HIDE_PRICE_REFINEMENT]: 'true' },
    };
    renderWithRouter(
      <SearchDataWrapper
        searchContextValue={refinements}
      >
        <BaseCatalogSearchResults
          {...defaultProps}
        />
      </SearchDataWrapper>,
    );
    const listViewToggleButton = screen.getByLabelText('List view');
    userEvent.click(listViewToggleButton);

    expect(screen.queryByText(messages['catalogSearchResults.table.courseName'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.catalogs'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.partner'].defaultMessage)).toBeInTheDocument();
    expect(screen.queryByText(messages['catalogSearchResults.table.availability'].defaultMessage)).toBeInTheDocument();
  });
});
